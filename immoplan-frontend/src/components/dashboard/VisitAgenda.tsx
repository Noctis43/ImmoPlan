import { useMemo, useState } from 'react';
import { addDays, addWeeks, format, isSameDay, isValid, startOfWeek, subWeeks } from 'date-fns';
import { Badge } from '../ui/Badge';
import { useTranslation } from 'react-i18next';
import { formatDateByOptions } from '../../lib/locale';

export type VisitStatus = 'en_attente' | 'contre_proposee' | 'confirmee' | 'annulee' | 'effectuee';

export interface VisiteAgendaItem {
  id: string;
  annonce_id: string;
  date_souhaitee: string;
  date_confirmee?: string;
  heure_debut: string;
  heure_confirmee?: string;
  duree_minutes: number;
  statut: VisitStatus;
  annonces?: { titre: string };
  profiles_visites_chercheur_idToprofiles?: { nom: string; prenom: string; avatar_url?: string };
  profiles_visites_offreur_idToprofiles?: { nom: string; prenom: string; avatar_url?: string };
  peutChangerStatut?: boolean;
  estPassee?: boolean;
}

const STATUS_CONFIG: Record<VisitStatus, { label: string; variant: 'amber' | 'teal' | 'red' | 'muted' | 'blue'; color: string }> = {
  en_attente: { label: 'En attente', variant: 'amber', color: 'var(--accent-amber)' },
  contre_proposee: { label: 'Contre proposee', variant: 'blue', color: '#4D9FFF' },
  confirmee: { label: 'Confirmee', variant: 'teal', color: 'var(--accent-teal)' },
  annulee: { label: 'Annulee', variant: 'red', color: '#FF4D4D' },
  effectuee: { label: 'Effectuee', variant: 'muted', color: 'var(--text-muted)' },
};

function eventDateKey(v: VisiteAgendaItem): string {
  const raw = v.statut === 'en_attente' ? v.date_souhaitee : (v.date_confirmee ?? v.date_souhaitee);
  if (typeof raw === 'string' && raw.length >= 10) return raw.slice(0, 10);
  try {
    const d = new Date(raw as string);
    return isValid(d) ? format(d, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  } catch {
    return format(new Date(), 'yyyy-MM-dd');
  }
}

function timeLabel(heure: string): string {
  const s = String(heure);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

interface VisitAgendaProps {
  visites: VisiteAgendaItem[];
}

export function VisitAgenda({ visites }: VisitAgendaProps) {
  const { t, i18n } = useTranslation();
  const currentWeekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const minWeekStart = useMemo(() => subWeeks(currentWeekStart, 104), [currentWeekStart]);
  const maxWeekStart = useMemo(() => addWeeks(currentWeekStart, 104), [currentWeekStart]);
  const [displayWeekStart, setDisplayWeekStart] = useState<Date>(currentWeekStart);

  const sorted = useMemo(() => {
    return [...visites].sort(
      (a, b) =>
        new Date(eventDateKey(a)).getTime() - new Date(eventDateKey(b)).getTime() ||
        timeLabel(a.statut === 'en_attente' ? a.heure_debut : (a.heure_confirmee ?? a.heure_debut)).localeCompare(
          timeLabel(b.statut === 'en_attente' ? b.heure_debut : (b.heure_confirmee ?? b.heure_debut))
        )
    );
  }, [visites]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(displayWeekStart, i));
  }, [displayWeekStart]);

  const byDay = useMemo(() => {
    const map = new Map<string, VisiteAgendaItem[]>();
    for (const v of sorted) {
      const key = eventDateKey(v);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    }
    return map;
  }, [sorted]);

  const weekLabel = `${formatDateByOptions(weekDays[0], { day: 'numeric', month: 'short' }, i18n.resolvedLanguage)} - ${formatDateByOptions(weekDays[6], { day: 'numeric', month: 'short', year: 'numeric' }, i18n.resolvedLanguage)}`;
  const canGoPrev = displayWeekStart.getTime() > minWeekStart.getTime();
  const canGoNext = displayWeekStart.getTime() < maxWeekStart.getTime();

  return (
    <section className="visit-agenda visit-agenda--calendar">
      <div className="visit-agenda__header">
        <h3 className="visit-agenda__title">{t('visitsAgenda.title')}</h3>
        <div className="visit-agenda__week-controls">
          <button
            type="button"
            className="visit-agenda__week-btn"
            onClick={() => setDisplayWeekStart((prev) => subWeeks(prev, 1))}
            disabled={!canGoPrev}
          >
            {t('visitsAgenda.lastWeek')}
          </button>
          <span className="visit-agenda__week-label">{weekLabel}</span>
          <button
            type="button"
            className="visit-agenda__week-btn"
            onClick={() => setDisplayWeekStart((prev) => addWeeks(prev, 1))}
            disabled={!canGoNext}
          >
            {t('visitsAgenda.nextWeek')}
          </button>
        </div>
      </div>

      <div className="visit-agenda__week-strip" aria-hidden="true">
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className="visit-agenda__week-day"
            data-today={isSameDay(day, new Date()) ? 'true' : 'false'}
          >
            <span className="visit-agenda__week-day-name">{formatDateByOptions(day, { weekday: 'short' }, i18n.resolvedLanguage)}</span>
            <span className="visit-agenda__week-day-date">{format(day, 'd')}</span>
          </div>
        ))}
      </div>

      {sorted.length === 0 ? (
        <p className="visit-agenda__empty">{t('visitsAgenda.nonePlanned')}</p>
      ) : (
        <div className="visit-agenda__calendar-grid">
          {weekDays.map((day) => {
            const ymd = format(day, 'yyyy-MM-dd');
            const dayVisites = byDay.get(ymd) ?? [];
            return (
              <article
                key={ymd}
                className="visit-agenda__calendar-day"
                data-today={isSameDay(day, new Date()) ? 'true' : 'false'}
              >
                <div className="visit-agenda__calendar-day-head">
                  <span>{formatDateByOptions(day, { weekday: 'long' }, i18n.resolvedLanguage)}</span>
                  <span>{formatDateByOptions(day, { day: 'numeric', month: 'short' }, i18n.resolvedLanguage)}</span>
                </div>
                <ul className="visit-agenda__calendar-events" role="list">
                  {dayVisites.length === 0 && <li className="visit-agenda__calendar-empty">{t('visitsAgenda.noneToday')}</li>}
                  {dayVisites.map((visite) => {
                    const cfg = STATUS_CONFIG[visite.statut] ?? STATUS_CONFIG.en_attente;
                    const heure =
                      visite.statut === 'en_attente' ? visite.heure_debut : (visite.heure_confirmee ?? visite.heure_debut);
                    const titre = visite.annonces?.titre ?? t('visitsAgenda.defaultVisit');
                    const chercheur = visite.profiles_visites_chercheur_idToprofiles;
                    const sousTitre =
                      chercheur && (chercheur.prenom || chercheur.nom)
                        ? `${chercheur.prenom ?? ''} ${chercheur.nom ?? ''}`.trim()
                        : null;

                    return (
                      <li key={visite.id} className="visit-agenda__calendar-event">
                        <div className="visit-agenda__calendar-event-time">
                          <time className="visit-agenda__time" dateTime={`${ymd}T${timeLabel(heure)}`}>
                            {timeLabel(heure)}
                          </time>
                          <span className="visit-agenda__duration">{visite.duree_minutes} min</span>
                        </div>
                        <div
                          className="visit-agenda__calendar-event-card"
                          style={{ borderLeftColor: cfg.color }}
                        >
                          <div className="visit-agenda__event-head">
                            <p className="visit-agenda__event-title">{titre}</p>
                            <Badge variant={cfg.variant}>{cfg.label}</Badge>
                          </div>
                          {sousTitre && <p className="visit-agenda__event-meta">{t('visitsAgenda.with', { name: sousTitre })}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
