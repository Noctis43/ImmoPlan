import type { Conversation } from '../store/chat';

/**
 * Normalise une conversation API vers le format attendu par l’UI.
 */
export function normalizeConversation(raw: Record<string, unknown> | Conversation): Conversation {
  const r = raw as Record<string, unknown>;
  const offreur = (r.offreur ?? r.profiles_conversations_offreur_idToprofiles) as Conversation['offreur'];
  const chercheur = (r.chercheur ?? r.profiles_conversations_chercheur_idToprofiles) as Conversation['chercheur'];
  const annonce = (r.annonce ?? r.annonces) as Conversation['annonce'];
  return {
    ...(raw as unknown as Conversation),
    id: String(raw.id),
    annonce_id: String(raw.annonce_id),
    offreur_id: String(raw.offreur_id),
    chercheur_id: String(raw.chercheur_id),
    created_at: typeof raw.created_at === 'string' ? raw.created_at : String(raw.created_at ?? ''),
    offreur,
    chercheur,
    annonce,
  };
}
