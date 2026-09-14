import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { defaultEngineConfig, localNow, type Progress } from '@/domain';

import { t } from '../../i18n/pt-BR';
import { useProgress } from '../../queries/useProgress';
import { useServices } from '../../services/ServicesProvider';

function Level({ progress }: { progress: Progress }) {
  const l = progress.level;
  return (
    <View>
      <Text style={styles.big}>{t.profile.level(l.level, l.name)}</Text>
      <Text>
        {l.nextLevelXp === null
          ? t.profile.maxLevel
          : t.profile.xpToNext(l.xpToNext ?? 0, nextName(l.level))}
      </Text>
    </View>
  );
}
const nextName = (level: number): string =>
  defaultEngineConfig.levels.find((x) => x.level === level + 1)?.name ?? '';

export function ProfileScreen() {
  const services = useServices();
  // Usa o fuso do aparelho como aproximação para "hoje" (só afeta a contagem de streak exibida).
  const offset = -new Date().getTimezoneOffset() * 60;
  const today = localNow(services.ports.clock.now(), offset).date;
  const progress = useProgress(today);

  if (!progress.data) return <Text style={styles.container}>{t.home.loading}</Text>;
  const p = progress.data;
  const unlocked = p.badges.filter((b) => b.unlocked).length;
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t.profile.title}</Text>
      <Level progress={p} />
      <Text>{`${t.profile.streak(p.streak)} · ${t.profile.activities(p.records.length)} · ${t.profile.cities(p.citiesCount)}`}</Text>
      <Text style={styles.section}>{t.profile.badges(unlocked, p.badges.length)}</Text>
      {p.badges.map((b) => (
        <Text
          key={b.id}
        >{`${b.unlocked ? '🏅' : '🔒'} ${t.badges[b.id]}${b.progress ? ` (${b.progress.current}/${b.progress.target})` : ''}`}</Text>
      ))}
      <Text style={styles.section}>{t.profile.history}</Text>
      {p.records.length === 0 ? <Text>{t.profile.empty}</Text> : null}
      {[...p.records].reverse().map((r) => (
        <Text
          key={r.id}
        >{`${r.date} · ${defaultEngineConfig.activities[r.activity].name} · ${r.hourLeft}h · +${r.xp.total} XP`}</Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  title: { fontSize: 20, fontWeight: '700' },
  big: { fontSize: 24, fontWeight: '700' },
  section: { fontWeight: '700', marginTop: 16 },
});
