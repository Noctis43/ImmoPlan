import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { profilesApi, interactionsApi, annoncesApi, messagerieApi } from '../../lib/api';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { AvisCard, type Avis } from '../../components/profile/AvisCard';
import { AnnonceGrid } from '../../components/annonces/AnnonceGrid';
import { Tabs } from '../../components/ui/Tabs';
import { PageTransition } from '../../components/layout/PageTransition';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/auth';
import type { Profile } from '../../store/auth';
import { unwrapArray, unwrapEntity } from '../../lib/unwrap';

const TABS = [
  { id: 'annonces', label: 'Annonces' },
  { id: 'avis', label: 'Avis' },
];

export default function PublicProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthStore();

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['profil', id],
    queryFn: () => profilesApi.getById(id!).then((r) => r.data),
    enabled: !!id,
  });

  const { data: avisData } = useQuery({
    queryKey: ['avis/profil', id],
    queryFn: () => interactionsApi.getAvisByProfile(id!).then((r) => r.data),
    enabled: !!id,
  });

  const { data: annoncesData } = useQuery({
    queryKey: ['annonces/profil', id],
    queryFn: () => annoncesApi.getByProfile(id!).then((r) => r.data),
    enabled: !!id,
  });

  // Record profile visit (sends notification to the offreur)
  useEffect(() => {
    if (id && user && user.id !== id) {
      profilesApi.visitProfile(id).catch(() => {});
    }
  }, [id, user]);

  const createConvMutation = useMutation({
    mutationFn: (annonceId: string) => messagerieApi.createConversation({ annonce_id: annonceId }),
    onSuccess: (res) => navigate(`/messagerie/${res.data.conversation?.id ?? res.data.id}`),
    onError: () => toast('Erreur', 'error'),
  });

  if (isLoading) {
    return <PageTransition><div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}><Skeleton style={{ height: 160, borderRadius: 16 }} /><Skeleton style={{ height: 300, borderRadius: 16 }} /></div></PageTransition>;
  }

  const profile: Profile = unwrapEntity<Profile>(profileData, ['profile']) ?? (profileData as Profile);
  const avis: Avis[] = unwrapArray<Avis>(avisData);
  const annonces = unwrapArray(annoncesData);
  const noteMoyenne = profileData?.note_moyenne ?? profileData?.profile?.note_moyenne;
  const nbAvis = avis.length;

  // Extract email and telephone from enriched profile data
  const profileEmail = (profileData as any)?.email ?? (profileData as any)?.data?.email ?? (profile as any)?.email;
  const profileTelephone = (profileData as any)?.telephone ?? (profileData as any)?.data?.telephone ?? (profile as any)?.telephone;

  return (
    <PageTransition>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <ProfileHeader
          profile={profile}
          noteMoyenne={noteMoyenne}
          nbAvis={nbAvis}
          showContact={!!user && user.id !== id}
          onContact={() => {
            if (annonces.length > 0) createConvMutation.mutate((annonces[0] as { id: string }).id);
            else toast('Aucune annonce pour contacter', 'info');
          }}
          email={profileEmail}
          telephone={profileTelephone}
        />

        <Tabs tabs={TABS} defaultTab="annonces">
          {(activeTab) => (
            <>
              {activeTab === 'annonces' && (
                <AnnonceGrid annonces={annonces as Parameters<typeof AnnonceGrid>[0]['annonces']} />
              )}
              {activeTab === 'avis' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {avis.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Aucun avis pour l&apos;instant</p>
                  ) : avis.map((a) => <AvisCard key={a.id} avis={a} />)}
                </div>
              )}
            </>
          )}
        </Tabs>
      </div>
    </PageTransition>
  );
}
