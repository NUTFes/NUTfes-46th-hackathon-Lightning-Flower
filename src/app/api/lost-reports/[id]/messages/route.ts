import { and, asc, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { ENDED_LOST_STATUSES } from "@/db/enums";
import { lostReports, messages } from "@/db/schema";
import { requireActor } from "@/lib/api/auth";
import { conflict, forbidden, notFound } from "@/lib/api/errors";
import { apiHandler } from "@/lib/api/handler";
import { parseBody, parseParams, parseQuery } from "@/lib/api/parse";
import type { Actor } from "@/lib/auth/actor";
import {
  LostReportIdParams,
  MessageCreate,
  MessageListQuery,
  type Message,
  type MessageList,
} from "@/lib/schemas/message";
import { toMessage } from "@/lib/serializers/message";

type Ctx = RouteContext<"/api/lost-reports/[id]/messages">;

type ChatActor =
  Extract<Actor, { role: "guest" }> | { role: "admin"; email: string };

// チャットを読み書きできるのは、申請した guest 本人と admin（member は不可）
async function requireChatActor(request: Request): Promise<ChatActor> {
  const actor = await requireActor(request);
  if (actor.role === "guest") return actor;
  if (actor.role !== "admin") throw forbidden();
  return { role: "admin", email: actor.email };
}

// guest がほかの人の申請を指したときは、あるかどうかも見せないように 404 にする
function canAccess(actor: ChatActor, report: { guestId: string }) {
  return actor.role === "admin" || report.guestId === actor.id;
}

const messageColumns = {
  id: messages.id,
  senderRole: messages.senderRole,
  body: messages.body,
  createdAt: messages.createdAt,
};

// メッセージの取得（guest は自分の申請だけ / admin）。画面：G06・A06
// 画面を開いている間、30 秒ごとに after 付きで呼ぶ
export const GET = apiHandler(async (request, ctx: Ctx) => {
  const actor = await requireChatActor(request);
  const { id } = parseParams(await ctx.params, LostReportIdParams);
  const { after } = parseQuery(request, MessageListQuery);

  const db = getDb();
  const [report] = await db
    .select({ guestId: lostReports.guestId })
    .from(lostReports)
    .where(eq(lostReports.id, id));
  if (!report || !canAccess(actor, report)) throw notFound();

  const rows = await db
    .select(messageColumns)
    .from(messages)
    .where(
      and(
        eq(messages.lostReportId, id),
        after ? gt(messages.createdAt, new Date(after)) : undefined,
      ),
    )
    .orderBy(asc(messages.createdAt), asc(messages.id));

  return Response.json({ items: rows.map(toMessage) } satisfies MessageList);
});

// メッセージの送信（guest は自分の申請だけ / admin）。画面：G06・A06
// guest は、admin から 1 通以上届いたスレッドで、終わっていない申請にだけ送れる（どちらも違えば 409）。
// admin は、終わった申請にも送れる（警察へ移管したことを伝えるなど）
export const POST = apiHandler(async (request, ctx: Ctx) => {
  const actor = await requireChatActor(request);
  const { id } = parseParams(await ctx.params, LostReportIdParams);
  const { body } = await parseBody(request, MessageCreate);

  const message = await getDb().transaction(async (tx) => {
    // 申請の行をロックして、確かめてから入れるまでの間に状態が変わらないようにする
    const [report] = await tx
      .select({ guestId: lostReports.guestId, status: lostReports.status })
      .from(lostReports)
      .where(eq(lostReports.id, id))
      .for("update");
    if (!report || !canAccess(actor, report)) throw notFound();

    if (actor.role === "guest") {
      if ((ENDED_LOST_STATUSES as readonly string[]).includes(report.status)) {
        throw conflict("終わった申請には送れません");
      }
      const [fromAdmin] = await tx
        .select({ id: messages.id })
        .from(messages)
        .where(
          and(eq(messages.lostReportId, id), eq(messages.senderRole, "admin")),
        )
        .limit(1);
      if (!fromAdmin) {
        throw conflict("本部からメッセージが届くまで、送れません");
      }
    }

    // メッセージは 1 つのトランザクションで 1 通だけ入れる（docs/api-guide.md）
    const [inserted] = await tx
      .insert(messages)
      .values({
        lostReportId: id,
        senderRole: actor.role,
        // 送った staff のメール。guest は申請から分かるので入れない
        senderEmail: actor.role === "admin" ? actor.email : null,
        body,
      })
      .returning(messageColumns);
    return inserted;
  });

  return Response.json(toMessage(message) satisfies Message, { status: 201 });
});
