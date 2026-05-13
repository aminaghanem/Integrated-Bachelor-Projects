import FoodPage from "../../components/FoodPage";

export default function ChinaFood() {
  return (
    <FoodPage
      countryName="China"
      foodImages={[
        "/countries/china/food/dumplings.png",
        "/countries/china/food/friedrice.png",
        "/countries/china/food/sweetsourchicken.png",
      ]}
    />
  );
}
