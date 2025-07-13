"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_ENDPOINTS = {
  SEARCH: "https://nominatim.openstreetmap.org/search.php",
  DETAILS: "https://nominatim.openstreetmap.org/details",
  REVERSE: "https://nominatim.openstreetmap.org/reverse",
};

const DEBOUNCE_DELAY = 500;
const MAX_RESULTS = 10;

// Định nghĩa kiểu dữ liệu thành phố từ API tìm kiếm 
interface City {
  osm_id: string;
  osm_type: string;
  display_name: string;
  lat: string;
  lon: string;
}

// Chi tiết thông tin thành phố từ API 
interface CityDetails {
  localname?: string;
  display_name: string;
  country_code?: string;
  addresstags?: {
    state?: string;
    country?: string;
  };
  admin_level?: string;
  type?: string;
  category?: string;
  importance?: number;
  centroid?: {
    coordinates: [number, number];
  };
  extratags?: {
    population?: string;
    website?: string;
    wikidata?: string;
    wikipedia?: string;
  };
}

// Validate tọa độ người dùng nhập 
const validateCoordinates = (lat: string, lon: string): string | null => {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);
  if (isNaN(latitude) || isNaN(longitude)) {
    return "Định dạng tọa độ không hợp lệ";
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return "Giá trị tọa độ không hợp lệ";
  }
  return null;
};

// Gọi API tìm kiếm thành phố theo tên 
const fetchCities = async (searchText: string): Promise<City[]> => {
  const res = await fetch(
    `${API_ENDPOINTS.SEARCH}?city=${encodeURIComponent(searchText)}&format=jsonv2&limit=${MAX_RESULTS}`
  );
  if (!res.ok) throw new Error("Không thể tải dữ liệu");
  return res.json();
};

// Gọi API lấy chi tiết thành phố theo osmtype/osmid 
const fetchCityDetails = async (osmtype: string, osmid: string): Promise<CityDetails> => {
  const res = await fetch(
    `${API_ENDPOINTS.DETAILS}?osmtype=${osmtype}&osmid=${osmid}&format=json`
  );
  if (!res.ok) throw new Error("Không thể tải chi tiết thành phố");
  return res.json();
};

export default function Page() {
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [selectedCity, setSelectedCity] = useState<CityDetails | null>(null);
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [coordError, setCoordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debounce giá trị search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Query danh sách thành phố theo tên 
  const { data: cities, isLoading } = useQuery({
    queryKey: ["cities", debouncedSearchText],
    queryFn: () => fetchCities(debouncedSearchText),
    enabled: debouncedSearchText.length > 0,
    staleTime: 5 * 60 * 1000, 
  });

  // Mutation lấy chi tiết thành phố 
  const cityDetailsMutation = useMutation({
    mutationFn: ({ osmtype, osmid }: { osmtype: string; osmid: string }) =>
      fetchCityDetails(osmtype, osmid),
    onSuccess: (data) => {
      setSelectedCity(data);
      setError(null);
    },
    onError: () => {
      setError("Không thể tải chi tiết thành phố. Vui lòng thử lại.");
    },
  });

  // Chọn thành phố từ danh sách kết quả tìm kiếm 
  const handleSelectCity = (item: City) => {
    setSearchText("");
    setCoordError(null);
    setError(null);
    cityDetailsMutation.mutate({
      osmtype: item.osm_type.charAt(0).toUpperCase(),
      osmid: item.osm_id,
    });
  };

  // Mutation tìm chi tiết thành phố theo tọa độ 
  const coordinateSearchMutation = useMutation({
    mutationFn: async ({ lat, lon }: { lat: string; lon: string }) => {
      const res = await fetch(
        `${API_ENDPOINTS.REVERSE}?lat=${lat}&lon=${lon}&zoom=10&format=json`
      );
      const data = await res.json();

      if (data.error || !data.osm_id || !data.osm_type) {
        throw new Error("Không tìm thấy kết quả");
      }

      return fetchCityDetails(
        data.osm_type.charAt(0).toUpperCase(),
        data.osm_id
      );
    },
    onSuccess: (data) => {
      setSelectedCity(data);
      setCoordError(null);
      setError(null);
      setSearchText("");
    },
    onError: () => {
      setCoordError("Không tìm thấy kết quả!");
      setSelectedCity(null);
    },
  });

  // Xử lý nút tìm kiếm theo tọa độ 
  const handleCoordSearch = () => {
    setError(null);
    const validationError = validateCoordinates(lat, lon);
    if (validationError) {
      setCoordError(validationError);
      return;
    }
    coordinateSearchMutation.mutate({ lat, lon });
  };

 return (
  <div
    className="min-h-screen flex flex-col bg-cover bg-center relative"
    style={{ backgroundImage: "url('/bg.jpg')" }}
  >
    <div className="relative z-10 flex flex-col flex-grow">
      <header className="text-center py-8">
        <h1
          className="text-5xl md:text-6xl font-extrabold uppercase tracking-wide text-white"
          style={{ WebkitTextStroke: '2px #60A5FA' }}
        >
          CITY SEARCH
        </h1>
        <p className="text-blue-400 mt-4 text-lg md:text-xl">
          Tra cứu thành phố theo tên hoặc tọa độ
        </p>
      </header>

      <main className="flex-grow flex justify-center px-4 mt-8 pb-5">
        <div className="bg-white/30 border border-white/40 shadow-xl rounded-2xl w-full max-w-2xl p-8 space-y-8 text-black mb-8">
          
          <div className="space-y-4 text-center">
            <label className="text-lg font-semibold text-black/90 block">
              Tìm kiếm theo tên thành phố
            </label>
            <input
              type="text"
              className="w-full p-5 md:p-6 rounded-full bg-white/60 placeholder-black text-center focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
              placeholder="Nhập tên thành phố ..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setSelectedCity(null);
                setCoordError(null);
                setError(null);
              }}
            />
          </div>

          <div className="space-y-4 text-center">
            <label className="text-lg font-semibold text-black/90 block">
              Hoặc tìm theo tọa độ
            </label>
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

          {coordError && (
            <div className="text-center text-red-600 mt-4">
              {coordError}
            </div>
          )}
          {error && (
            <div className="text-center text-red-600 mt-4">
              {error}
            </div>
          )}

          {debouncedSearchText && !selectedCity && (
            <div
              className="space-y-2 overflow-y-auto mt-8"
              style={{ maxHeight: 'calc(100vh - 250px)' }}
            >
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
                  {cities.map((item, idx) => (
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

          {selectedCity && (
          <div>
              <div className="bg-white/30 rounded-lg p-5 md:p-6 border border-white/30 shadow mt-8">
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
