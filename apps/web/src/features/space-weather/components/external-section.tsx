import { getServices } from "@/server/services";
import { MetricCard } from "@/shared/ui/metric-card";

import { radiationCard, spaceWeatherCards, type ExternalCard } from "../space-weather.display";

async function loadCards(): Promise<ExternalCard[]> {
  const { spaceWeather, radiation } = getServices();
  const [weather, window] = await Promise.all([spaceWeather.getSnapshot(), radiation.getWindow()]);
  const cards = weather.ok ? spaceWeatherCards(weather.value) : [];
  const ambient = window.ok ? radiationCard(window.value) : null;
  return ambient ? [...cards, ambient] : cards;
}

export async function ExternalSection() {
  const cards = await loadCards();
  if (cards.length === 0) {
    return <p className="text-sm text-muted-foreground">No se pudo contactar a NASA ni a NOAA por ahora.</p>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <MetricCard
          key={card.id}
          title={card.title}
          value={card.value}
          line={card.line}
          icon={card.icon}
          tone={card.tone}
          source={card.source}
        />
      ))}
    </div>
  );
}
