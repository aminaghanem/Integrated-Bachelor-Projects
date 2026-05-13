"use client";
import LandmarkPage from "../../components/LandmarkPage";

export default function EgyptLandmarksPage() {
  return (
    <LandmarkPage
      countryName="Egypt"
      landmarkImages={[
        "/countries/egypt/landmarks/cairotower.jpg",
        "/countries/egypt/landmarks/pyramidsofGiza.png",
        "/countries/egypt/landmarks/abusimbeltemple.jpg",
      ]}
    />
  );
}
