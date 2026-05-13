"use client";
import LandmarkPage from "../../components/LandmarkPage";

export default function ChinaLandmarksPage() {
  return (
    <LandmarkPage
      countryName="China"
      landmarkImages={[
        "/countries/china/landmarks/temple-of-heaven.png",
        "/countries/china/landmarks/forbidden-city.png",
        "/countries/china/landmarks/oriental-pearl-tower.png",
      ]}
    />
  );
}
