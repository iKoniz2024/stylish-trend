import Home from "@/views/Home/Home";
import { getApiUrl } from "@/utils/getApiUrl";

export const metadata = {
  title: "Home",
};

export const revalidate = 60;

async function fetchHomeData() {
  const baseUrl = getApiUrl();

  const fetchSafeJson = async (url, fallback) => {
    try {
      const res = await fetch(url, {
        next: { revalidate: 60 },
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn(`Fetch timed out or failed for ${url}:`, err.message);
    }
    return fallback;
  };

  const [
    categoriesData,
    newArrivalsData,
    bestSellingData,
    flashSaleData,
    bannersData,
  ] = await Promise.all([
    fetchSafeJson(`${baseUrl}/categories/with-counts`, []),
    fetchSafeJson(`${baseUrl}/products/new-arrivals`, { products: [] }),
    fetchSafeJson(`${baseUrl}/products/best-sellers`, { products: [] }),
    fetchSafeJson(`${baseUrl}/products/flash-sale`, { products: [] }),
    fetchSafeJson(`${baseUrl}/banners`, []),
  ]);

  return {
    categoriesData,
    newArrivalsData,
    bestSellingData,
    flashSaleData,
    bannersData,
  };
}

export default async function Page() {
  const initialData = await fetchHomeData();

  return <Home initialData={initialData} />;
}
