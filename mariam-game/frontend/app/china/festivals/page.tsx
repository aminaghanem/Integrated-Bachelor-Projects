"use client";
import FestivalPage from "../../components/FestivalPage";

export default function ChinaFestivalsPage() {
  return (
    <FestivalPage
      countryName="China"
      festivalImages={[
        "/countries/china/festivals/spring-festival.png",
        "/countries/china/festivals/lantern-festival.png",
        "/countries/china/festivals/mid-autumn-festival.png",
      ]}
    />
  );
}
