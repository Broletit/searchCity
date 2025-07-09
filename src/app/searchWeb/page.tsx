"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

export default function Page() {
  const [searchText, setSearchText] = useState("");
  const [selectedCity, setSelectedCity] = useState<any>(null);
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [coordError, setCoordError] = useState(false);

  const fetchCities = async () => {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search.php?city=${encodeURIComponent(searchText)}&format=jsonv2`
    );
    return res.json();
  };

  const { data: cities, isLoading, error } = useQuery({
    queryKey: ["cities", searchText],
    queryFn: fetchCities,
    enabled: searchText.length > 0,
  });

  const fetchCityDetails = async (osmtype: string, osmid: string) => {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/details?osmtype=${osmtype}&osmid=${osmid}&format=json`
    );
    return res.json();
  };

  const handleSelectCity = async (item: any) => {
    setSearchText("");
    setCoordError(false);

    try {
      const details = await fetchCityDetails(
        item.osm_type.charAt(0).toUpperCase(),
        item.osm_id
      );
      setSelectedCity(details);
    } catch (e) {
      console.error("Error fetching details:", e);
    }
  };

  const handleCoordSearch = async () => {
    if (!lat || !lon) return;

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&zoom=10&format=json`
      );
      const data = await res.json();

      if (data.error || !data.osm_id || !data.osm_type) {
        setSelectedCity(null);
        setCoordError(true);
        return;
      }

      const details = await fetchCityDetails(
        data.osm_type.charAt(0).toUpperCase(),
        data.osm_id
      );

      setSelectedCity(details);
      setCoordError(false);
      setSearchText("");
    } catch (e) {
      console.error(e);
      setCoordError(true);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col bg-cover bg-center relative"
      style={{
        backgroundImage: "url('/bg.jpg')",
      }}
    >
      <div className="relative z-10 flex flex-col flex-grow">
        <header className="text-center py-8">
          <h1
            className="text-5xl md:text-6xl font-extrabold uppercase tracking-wide text-transparent"
            style={{
              WebkitTextStroke: '2px #60A5FA',
              color: 'white',
            }}
          >
            CITY SEARCH
          </h1>
          <p className="text-blue-400 mt-4 text-lg md:text-xl">
            Tra cứu thành phố theo tên hoặc tọa độ
          </p>
        </header>
        <main className="flex-grow flex justify-center px-4 mt-8 p-[10px]" style={{ marginBottom: '20px' }}>
          <div className="bg-white/30 border border-white/40 shadow-xl rounded-2xl w-full max-w-2xl p-8 space-y-8 text-black mb-8">
            <div className="space-y-4 text-center">
              <label className="text-lg font-semibold text-black/90 block">Tìm kiếm theo tên thành phố</label>
              <input
                type="text"
                className="w-full p-5 md:p-6 rounded-full bg-white/60 placeholder-black text-center focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
                placeholder="Nhập tên thành phố ..."
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setSelectedCity(null);
                  setCoordError(false);
                }}
              />
            </div>
            <div className="space-y-4 text-center">
              <label className="text-lg font-semibold text-black/90 block">Hoặc tìm theo tọa độ</label>
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  placeholder="Latitude ..."
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="flex-1 p-5 md:p-6 rounded-lg bg-white/60 placeholder-black text-center focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
                />
                <input
                  type="text"
                  placeholder="Longitude ..."
                  value={lon}
                  onChange={(e) => setLon(e.target.value)}
                  className="flex-1 p-5 md:p-6 rounded-lg bg-white/60 placeholder-black text-center focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
                />
                <button
                  onClick={handleCoordSearch}
                  className="bg-blue-300 hover:bg-blue-500 rounded-full p-4 flex items-center justify-center transition shadow-lg"
                >
                  Search
                </button>
              </div>
            </div>
            {searchText && !selectedCity && (
              <div className="space-y-2 overflow-y-auto mt-8"
                   style={{ maxHeight: 'calc(100vh - 250px)', marginTop: '30px' }}>
                {isLoading && (
                  <div className="text-center text-black/80">Đang tìm...</div>
                )}
                {cities && cities.length === 0 && (
                  <div className="text-center text-black/80">
                    Không tìm thấy kết quả!
                  </div>
                )}
                {cities && cities.length > 0 && (
                  <ul className="divide-y divide-white/30">
                    {cities.map((item: any, idx: number) => (
                      <li
                        key={idx}
                        className="p-4 md:p-5 rounded-lg hover:bg-white/20 cursor-pointer transition"
                        onClick={() => handleSelectCity(item)}
                      >
                        <div className="font-semibold">{item.display_name}</div>
                        <div className="text-sm text-black/80 mt-1">
                          Lat: {item.lat}, Lon: {item.lon}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {coordError && (
              <div className="text-center text-red/80 mt-4">
                Không tìm thấy kết quả!
              </div>
            )}
            {selectedCity && (
              <div
                className="bg-white/30 rounded-lg p-5 md:p-6 border border-white/30 shadow"
                style={{ marginTop: '30px' }}
              >
                <p className="text-lg font-bold mb-4">
                  {selectedCity.localname || selectedCity.display_name}
                </p>

                {selectedCity.addresstags && (
                  <div className="text-sm mb-2 space-y-1">
                    {selectedCity.addresstags.state && (
                      <p><strong>State:</strong> {selectedCity.addresstags.state}</p>
                    )}
                    {selectedCity.addresstags.country && (
                      <p><strong>Country:</strong> {selectedCity.addresstags.country}</p>
                    )}
                    {selectedCity.country_code && (
                      <p><strong>Country Code:</strong> {selectedCity.country_code.toUpperCase()}</p>
                    )}
                  </div>
                )}

                {selectedCity.admin_level && (
                  <p><strong>Admin Level:</strong> {selectedCity.admin_level}</p>
                )}
                {selectedCity.type && (
                  <p><strong>Type:</strong> {selectedCity.type}</p>
                )}
                {selectedCity.category && (
                  <p><strong>Category:</strong> {selectedCity.category}</p>
                )}
                {selectedCity.importance && (
                  <p><strong>Importance:</strong> {selectedCity.importance}</p>
                )}

                {selectedCity.centroid && (
                  <>
                    <p><strong>Latitude:</strong> {selectedCity.centroid.coordinates[1]}</p>
                    <p><strong>Longitude:</strong> {selectedCity.centroid.coordinates[0]}</p>
                  </>
                )}

                {selectedCity.extratags && (
                  <>
                    {selectedCity.extratags.population && (
                      <p><strong>Population:</strong> {selectedCity.extratags.population}</p>
                    )}
                    {selectedCity.extratags.website && (
                      <p>
                        <strong>Website:</strong>{" "}
                        <a
                          href={selectedCity.extratags.website}
                          target="_blank"
                          rel="noreferrer"
                          className="underline text-blue-700"
                        >
                          {selectedCity.extratags.website}
                        </a>
                      </p>
                    )}
                    {selectedCity.extratags.wikidata && (
                      <p><strong>Wikidata:</strong> {selectedCity.extratags.wikidata}</p>
                    )}
                    {selectedCity.extratags.wikipedia && (
                      <p><strong>Wikipedia:</strong> {selectedCity.extratags.wikipedia}</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </main>
        <footer className="bg-black/60 text-center text-sm py-10 text-blue-100 backdrop-blur-sm">
          © City Search | React + Tailwind
        </footer>
      </div>
    </div>
  );
}
