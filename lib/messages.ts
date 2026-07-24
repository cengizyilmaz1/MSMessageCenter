import { Message, MessageArchive, MessageHistory, MessageSource, MessageVersion } from '@/types/message';
import dataMessages from '@/@data/messages.json'
import dataArchive from '@/@data/messages-archive.json'
import dataRoadmap from '@/@data/roadmap.json'
import fs from 'fs'
import path from 'path'
import {
    getCanonicalMessagePath,
    getMessageSlug,
    parseMessageIdFromSlug,
    slugifyService,
} from '@/lib/slugs.mjs'

const messages: Message[] = [...dataMessages, ...dataRoadmap].sort((a, b) => {
    const dateA = new Date(a.LastModifiedDateTime || a.StartDateTime || 0).getTime();
    const dateB = new Date(b.LastModifiedDateTime || b.StartDateTime || 0).getTime();

    return dateB - dateA;
});
const archiveIndex: MessageArchive[] = dataArchive as MessageArchive[];

export function getAllMessageStaticParams(): { id: string }[] {
    const messageIds = messages
        .filter((item) => getMessageSource(item) === MessageSource.MessageCenter)
        .map((item) => ({ id: getMessageSlug(item) }));
    const activeIds = new Set(messages.map((item) => item.Id));
    const archiveIds = archiveIndex
        .filter((item) => !activeIds.has(item.Id))
        .map((item) => ({ id: getMessageSlug(item) }));

    return [...messageIds, ...archiveIds];
}

export function getAllMessages(): Message[] {
    return messages;
}

export function getAllRoadmapStaticParams(): { id: string }[] {
    return messages
        .filter((item) => getMessageSource(item) === MessageSource.Roadmap)
        .map((item) => ({ id: getMessageSlug(item) }));
}

export function getSimilarMessages(msgId: string, limit = 5): Message[] {
    const msg = getMessageData(msgId);
    if (!msg) return [];
    const services = new Set(msg.Services ?? []);
    const category = msg.Category;
    const tags = new Set(msg.Tags ?? []);
    const source = getMessageSource(msg);

    return messages
        .filter((m) => m.Id !== msg.Id && getMessageSource(m) === source)
        .map((m) => {
            let score = 0;
            if (m.Services?.some((s) => services.has(s))) score += 3;
            if (category && m.Category === category) score += 2;
            if (m.Tags?.some((t) => tags.has(t))) score += 1;
            return { m, score };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ m }) => m);
}

export function getArchiveMessages(): MessageArchive[] {
    return archiveIndex;
}

export function getMessageCounts() {
    const activeMessageCenter = messages.filter((item) => getMessageSource(item) === MessageSource.MessageCenter).length;
    const roadmap = messages.filter((item) => getMessageSource(item) === MessageSource.Roadmap).length;
    const archive = archiveIndex.length;
    const major = messages.filter((item) => item.IsMajorChange).length;

    return {
        active: activeMessageCenter,
        roadmap,
        archive,
        major,
        total: activeMessageCenter + roadmap + archive,
    };
}

export function getLatestMessageDate(): string | undefined {
    return messages[0]?.LastModifiedDateTime || messages[0]?.StartDateTime;
}

// Services from the upstream feed are not clean: the same service can appear
// with a trailing space ("Microsoft Clipchamp ") or different casing
// ("Microsoft 365 admin center" vs "...Admin Center"). Both collapse to one
// slug, so we deduplicate by slug (keeping the first canonical display name).
// This removes duplicate /service URLs from the sitemap and prevents two
// static params from resolving to the same page.
export function getAllServices(): string[] {
    const bySlug = new Map<string, string>();
    const add = (service: string | undefined) => {
        const name = service?.trim();
        if (!name) return;
        const slug = slugifyService(name);
        if (!bySlug.has(slug)) bySlug.set(slug, name);
    };
    for (const msg of messages) for (const service of msg.Services ?? []) add(service);
    for (const msg of archiveIndex) for (const service of msg.Services ?? []) add(service);
    return [...bySlug.values()].sort((a, b) => a.localeCompare(b));
}

export function getMessagesBySource(source: MessageSource): Message[] {
    return messages.filter((item) => getMessageSource(item) === source);
}

// Slug-keyed index of messages by service, built once. Matching by slug (not by
// exact string) means messages tagged with either spelling of a collapsed
// service (e.g. with/without a trailing space) all appear on the one page.
let _messagesByServiceSlug: Map<string, Message[]> | null = null;
function getMessagesByServiceSlug(): Map<string, Message[]> {
    if (_messagesByServiceSlug) return _messagesByServiceSlug;
    const map = new Map<string, Message[]>();
    for (const item of messages) {
        const slugs = new Set((item.Services ?? []).filter(Boolean).map((s) => slugifyService(s)));
        for (const slug of slugs) {
            const list = map.get(slug);
            if (list) list.push(item);
            else map.set(slug, [item]);
        }
    }
    _messagesByServiceSlug = map;
    return map;
}

export function getMessagesByService(service: string): Message[] {
    return getMessagesByServiceSlug().get(slugifyService(service)) ?? [];
}

export function getMessageData(id: string): Message | undefined{
    const messageId = parseMessageIdFromSlug(id);
    const message = messages.find((item) => item.Id === messageId);

    if (message) return message;

    try {
        const filePath = path.join(process.cwd(), '@data', 'archive', `${messageId}.json`);
        const raw = fs.readFileSync(filePath, 'utf-8');

        return JSON.parse(raw) as Message;
    } catch {
        return undefined;
    }
}

export function getMessageCanonicalPath(id: string): string {
    const message = getMessageData(id);

    if (message) {
        return getCanonicalMessagePath(message);
    }

    return `/message/${parseMessageIdFromSlug(id).toLowerCase()}`;
}

export function getMessageSummary(msg: Message | undefined): string {    
    const summary = msg?.Details?.find((item) => item.Name === "Summary");
    return summary?.Value?.toString() || "";
}

export function stripHtml(value: string | undefined | null): string {
    if (!value) return "";

    return value
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim();
}

export function truncateText(value: string, maxLength = 180): string {
    if (value.length <= maxLength) return value;

    const truncated = value.slice(0, maxLength - 1).trimEnd();
    const lastSpace = truncated.lastIndexOf(" ");

    return `${lastSpace > 80 ? truncated.slice(0, lastSpace) : truncated}...`;
}

export function getMessageDescription(msg: Message | undefined): string {
    return truncateText(stripHtml(getMessageSummary(msg) || msg?.Body?.Markdown || msg?.Body?.Content));
}

export function getMessageRoadmapID(msg: Message | undefined): string {    
    const roadmapId = msg?.Details?.find((item) => item.Name === "RoadmapIds");
    return roadmapId?.Value?.toString() || "";
}

export function getMessagePlatforms(msg: Message | undefined): string {    
    const platforms = msg?.Details?.find((item) => item.Name === "Platforms");
    return platforms?.Value?.toString() || "";
}

export function getMessageDetailValue(msg: Message | undefined, name: string): string {
    const detail = msg?.Details?.find((item) => item.Name === name);
    return detail?.Value?.toString() || "";
}

export function getMessageSource(msg: Message | undefined): MessageSource {
    return msg?.Source === MessageSource.Roadmap ? MessageSource.Roadmap : MessageSource.MessageCenter;
}

export function getMessageSourceLabel(msg: Message | undefined): string {
    return getMessageSource(msg) === MessageSource.Roadmap ? "Microsoft 365 Roadmap" : "Message Center";
}

export function getFormattedDate(dateInput: string | undefined | null): string {
    if (!dateInput) return "";
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    });
}

// ---------------------------------------------------------------------------
// Version history
// ---------------------------------------------------------------------------

const historyCache = new Map<string, MessageHistory | null>();

export function getMessageHistory(id: string): MessageHistory | undefined {
    const messageId = parseMessageIdFromSlug(id);
    if (historyCache.has(messageId)) {
        const cached = historyCache.get(messageId);
        return cached ?? undefined;
    }
    try {
        const filePath = path.join(process.cwd(), '@data', 'history', `${messageId}.json`);
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw) as MessageHistory;
        historyCache.set(messageId, parsed);
        return parsed;
    } catch {
        historyCache.set(messageId, null);
        return undefined;
    }
}

export function hasMultipleVersions(id: string): boolean {
    const history = getMessageHistory(id);
    return !!history && history.versions.length > 1;
}

// URL-safe slug for an ISO timestamp. We replace `:` and `.` with `-` so the
// slug is filesystem- and URL-safe while remaining humanly readable.
export function slugifyCapturedAt(capturedAt: string): string {
    return capturedAt.replace(/[:.]/g, '-');
}

export function unslugifyCapturedAt(slug: string): string {
    // ISO format: YYYY-MM-DDTHH-MM-SS-sssZ -> reinsert separators.
    const m = slug.match(/^(\d{4}-\d{2}-\d{2}T\d{2})-(\d{2})-(\d{2})(?:-(\d+))?(Z)?$/);
    if (m) {
        const [, ymdHH, mm, ss, ms, z] = m;
        const base = `${ymdHH}:${mm}:${ss}`;
        return ms ? `${base}.${ms}${z ?? ''}` : `${base}${z ?? ''}`;
    }
    return slug;
}

export function getMessageVersion(id: string, capturedAtSlug: string): MessageVersion | undefined {
    const history = getMessageHistory(id);
    if (!history) return undefined;
    return history.versions.find((v) => slugifyCapturedAt(v.capturedAt) === capturedAtSlug);
}

function historySourceMatches(id: string, message: Message | undefined, source?: MessageSource): boolean {
    if (!source) return true;
    const inferredSource = message
        ? getMessageSource(message)
        : /^RM/i.test(id)
            ? MessageSource.Roadmap
            : MessageSource.MessageCenter;

    return inferredSource === source;
}

export function getAllVersionParams(source?: MessageSource): { id: string; capturedAt: string }[] {
    const ids = listAllHistoryIds();
    const out: { id: string; capturedAt: string }[] = [];
    const seen = new Set<string>();
    for (const id of ids) {
        const history = getMessageHistory(id);
        if (!history || history.versions.length < 2) continue;
        // Skip orphaned history (ids with no detail page — records that dropped
        // out of the feed and were never archived) so we never emit a version
        // page whose parent detail page 404s.
        if (!getKnownIds().has(id)) continue;
        // Latest version is rendered by the main detail page; only older
        // versions need their own snapshot page.
        const versions = history.versions.slice(0, -1);
        const latest = history.versions[history.versions.length - 1]?.message ?? getMessageData(id);
        if (!historySourceMatches(id, latest, source)) continue;
        const routeId = latest ? getMessageSlug(latest) : id.toLowerCase();
        for (const v of versions) {
            const capturedAt = slugifyCapturedAt(v.capturedAt);
            const key = `${routeId}/v/${capturedAt}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ id: routeId, capturedAt });
        }
    }
    return out;
}

// One route id per message that has a comparable history (>= 2 versions). Used
// to statically generate a SINGLE compare shell per message; the from/to pair
// is read client-side from the query string, so we no longer enumerate the
// combinatorial N×N pairs (which produced tens of thousands of static pages).
export function getComparableMessageParams(source?: MessageSource): { id: string }[] {
    const ids = listAllHistoryIds();
    const out: { id: string }[] = [];
    const seen = new Set<string>();
    for (const id of ids) {
        const history = getMessageHistory(id);
        if (!history || history.versions.length < 2) continue;
        if (!getKnownIds().has(id)) continue;
        const latest = history.versions[history.versions.length - 1]?.message ?? getMessageData(id);
        if (!historySourceMatches(id, latest, source)) continue;
        const routeId = latest ? getMessageSlug(latest) : id.toLowerCase();
        if (seen.has(routeId)) continue;
        seen.add(routeId);
        out.push({ id: routeId });
    }
    return out;
}

function listAllHistoryIds(): string[] {
    try {
        const dir = path.join(process.cwd(), '@data', 'history');
        return fs.readdirSync(dir)
            .filter((f) => f.endsWith('.json'))
            .map((f) => f.slice(0, -5));
    } catch {
        return [];
    }
}

// Returns a short label of which top-level fields differ between two
// messages, used for the timeline summary line. Body changes are detected
// by content equality, not diff size.
export function summarizeChanges(prev: Message | undefined, next: Message): string[] {
    if (!prev) return ["Initial version"];
    const changed: string[] = [];
    if ((prev.Title ?? "") !== (next.Title ?? "")) changed.push("Title");
    if ((prev.Body?.Content ?? "") !== (next.Body?.Content ?? "")) changed.push("Body");
    if (JSON.stringify([...(prev.Tags ?? [])].sort()) !== JSON.stringify([...(next.Tags ?? [])].sort())) changed.push("Tags");
    if (JSON.stringify([...(prev.Services ?? [])].sort()) !== JSON.stringify([...(next.Services ?? [])].sort())) changed.push("Services");
    if ((prev.Category ?? "") !== (next.Category ?? "")) changed.push("Category");
    if ((prev.Severity ?? "") !== (next.Severity ?? "")) changed.push("Severity");
    if (!!prev.IsMajorChange !== !!next.IsMajorChange) changed.push("Major change flag");
    if ((prev.ActionRequiredByDateTime ?? null) !== (next.ActionRequiredByDateTime ?? null)) changed.push("Act-by date");
    if ((prev.EndDateTime ?? null) !== (next.EndDateTime ?? null)) changed.push("End date");

    const prevStatus = prev.Details?.find((d) => d.Name === "Status")?.Value ?? "";
    const nextStatus = next.Details?.find((d) => d.Name === "Status")?.Value ?? "";
    if (prevStatus !== nextStatus) changed.push("Status");
    const prevPhase = prev.Details?.find((d) => d.Name === "ReleasePhase")?.Value ?? "";
    const nextPhase = next.Details?.find((d) => d.Name === "ReleasePhase")?.Value ?? "";
    if (prevPhase !== nextPhase) changed.push("Release phase");

    return changed.length ? changed : ["No tracked field changed"];
}

// ---------------------------------------------------------------------------
// Cross-message references (MC <-> MC linking)
// ---------------------------------------------------------------------------

const MC_ID_RE = /\bMC\d{6,7}\b/g;

// Set of every message id we know about. Built lazily and used to validate
// cross-references so we never emit a link to a non-existent page.
let _knownIds: Set<string> | null = null;
function getKnownIds(): Set<string> {
    if (_knownIds) return _knownIds;
    const set = new Set<string>();
    for (const m of messages) set.add(m.Id);
    for (const a of archiveIndex) set.add(a.Id);
    _knownIds = set;
    return set;
}

// Inverse-reference index: for each message id, which other message ids
// mention it in their Body.Content or Summary. Built lazily on first use
// so the cost is amortized across the build.
interface RelationIndex {
    references: Map<string, string[]>;   // id -> list of MC ids that THIS id references
    referencedBy: Map<string, string[]>; // id -> list of MC ids that reference THIS id
}

let _relations: RelationIndex | null = null;

function buildRelations(): RelationIndex {
    const references = new Map<string, Set<string>>();
    const referencedBy = new Map<string, Set<string>>();
    const known = getKnownIds();

    const addEdge = (from: string, to: string) => {
        if (from === to) return;
        if (!known.has(to)) return;
        if (!references.has(from)) references.set(from, new Set());
        references.get(from)!.add(to);
        if (!referencedBy.has(to)) referencedBy.set(to, new Set());
        referencedBy.get(to)!.add(from);
    };

    const scan = (id: string, text: string | undefined | null) => {
        if (!text) return;
        const matches = text.match(MC_ID_RE);
        if (!matches) return;
        for (const m of matches) addEdge(id, m);
    };

    // Active feed (messages.json + roadmap.json).
    for (const m of messages) {
        scan(m.Id, m.Body?.Content);
        scan(m.Id, getMessageSummary(m));
    }

    // Archive-only ids: full body lives on disk; the slim index doesn't carry
    // the body, so we read each archive file. This adds O(N) reads at first
    // call but is amortized across the build.
    const knownActiveIds = new Set(messages.map((m) => m.Id));
    const archiveDir = path.join(process.cwd(), '@data', 'archive');
    let archiveFiles: string[] = [];
    try {
        archiveFiles = fs.readdirSync(archiveDir).filter((f) => f.endsWith('.json'));
    } catch {
        archiveFiles = [];
    }
    for (const file of archiveFiles) {
        const id = file.slice(0, -5);
        if (knownActiveIds.has(id)) continue;
        try {
            const raw = fs.readFileSync(path.join(archiveDir, file), 'utf-8');
            const msg = JSON.parse(raw) as Message;
            scan(msg.Id, msg.Body?.Content);
            scan(msg.Id, getMessageSummary(msg));
        } catch {
            // ignore
        }
    }

    const sortIdsDesc = (a: string, b: string) => {
        // MC ids are numeric after the prefix; sort highest (newest) first.
        const na = Number(a.replace(/^MC/, ''));
        const nb = Number(b.replace(/^MC/, ''));
        return nb - na;
    };

    const finalize = (m: Map<string, Set<string>>) => {
        const out = new Map<string, string[]>();
        for (const [k, v] of m) out.set(k, [...v].sort(sortIdsDesc));
        return out;
    };

    return {
        references: finalize(references),
        referencedBy: finalize(referencedBy),
    };
}

function getRelations(): RelationIndex {
    if (!_relations) _relations = buildRelations();
    return _relations;
}

export function getMessageReferences(id: string): string[] {
    return getRelations().references.get(id) ?? [];
}

export function getMessageReferencedBy(id: string): string[] {
    return getRelations().referencedBy.get(id) ?? [];
}

// Replace every plain-text MC id (one not already wrapped in an <a> tag)
// with an internal anchor pointing at the canonical detail URL. We deliberately do not
// touch ids inside an existing <a>...</a> so as not to override links the
// upstream feed already provides (e.g. admin.microsoft.com deep links).
//
// The scanner is HTML-aware enough to distinguish anchor scope without a
// real parser: it tracks an <a> nesting depth and skips id replacement
// while depth > 0. Tag attributes are also skipped because we only replace
// inside text-node regions.
export function linkifyMcIds(html: string | undefined | null, currentId?: string): string {
    if (!html) return "";
    const known = getKnownIds();
    let out = "";
    let i = 0;
    let anchorDepth = 0;
    const len = html.length;

    while (i < len) {
        const ch = html[i];
        if (ch === "<") {
            // Find the end of the tag.
            const end = html.indexOf(">", i);
            if (end === -1) {
                out += html.slice(i);
                break;
            }
            const tag = html.slice(i, end + 1);
            // Detect <a ...>, </a>, ignoring <area>/<address>/etc by checking
            // the character right after the opening "<" or "</".
            const lower = tag.toLowerCase();
            if (/^<a\b/.test(lower)) anchorDepth++;
            else if (/^<\/a\s*>/.test(lower)) anchorDepth = Math.max(0, anchorDepth - 1);
            out += tag;
            i = end + 1;
            continue;
        }

        // Text node: read until next "<".
        const next = html.indexOf("<", i);
        const segment = next === -1 ? html.slice(i) : html.slice(i, next);
        if (anchorDepth > 0) {
            out += segment;
        } else {
            out += segment.replace(MC_ID_RE, (match) => {
                if (currentId && match === currentId) return match;
                if (!known.has(match)) return match;
                return `<a href="${getMessageCanonicalPath(match)}" class="mc-ref-link" data-mc-ref="${match}">${match}</a>`;
            });
        }
        if (next === -1) break;
        i = next;
    }

    return out;
}
