import FoodPage from "../../components/FoodPage";

export default function EgyptFood() {
  return (
    <FoodPage
      countryName="Egypt"
      foodImages={[
        "/countries/egypt/food/feteer.jpg",
        "/countries/egypt/food/koshari.jpg",
        "/countries/egypt/food/omali.jpg",
      ]}
    />
  );
}
