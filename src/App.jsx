import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import "./App.css";
import ChargingMap from "./ChargingMap";
import "leaflet/dist/leaflet.css";

const stations = [
  {
    id: 1,
    name: "GreenCharge Central",
    location: "MG Road, Bengaluru",
    power: "60 kW",
    price: 15,
    connector: "CCS2",
    lat: 12.9756, lon: 77.6050,
  },
  {
    id: 2,
    name: "VoltHub Station",
    location: "Indiranagar, Bengaluru",
    power: "120 kW",
    price: 18,
    connector: "CCS2",
    lat: 12.9784, lon: 77.6408,
  },
  {
    id: 3,
    name: "EcoCharge Point",
    location: "Koramangala, Bengaluru",
    power: "30 kW",
    price: 12,
    connector: "Type 2",
    lat: 12.9352, lon: 77.6245,
  },
  {
    id: 4,
    name: "PowerGrid EV",
    location: "Whitefield, Bengaluru",
    power: "150 kW",
    price: 20,
    connector: "CCS2",
    lat: 12.9698, lon: 77.7500,
  },
];

function MainApp() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState("Explore");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [battery, setBattery] = useState(20);
  const [target, setTarget] = useState(80);
  const [capacity, setCapacity] = useState(40);
  const [price, setPrice] = useState(15);
  const [bookings, setBookings] = useState([]);
  const [bookingStation, setBookingStation] = useState(null);
  const [bookingDate, setBookingDate] = useState(() => {
    const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 10);
  });
  const [bookingTime, setBookingTime] = useState("10:00");
  const [bookingConnector, setBookingConnector] = useState("CCS2");
  const [bookingVehicleId, setBookingVehicleId] = useState("");
  const [bookingMessage, setBookingMessage] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [vehicles, setVehicles] = useState([]);
  const [primaryVehicleId, setPrimaryVehicleId] = useState(null);
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [vehicleDraft, setVehicleDraft] = useState({
    category: "2w",
    model: "",
    customName: "",
    photoUrl: "",
    registration: "",
    batteryCapacity: "",
    connector: "Type 2",
    rangeKm: "",
    preferredChargeLimit: "80",
    preferredChargingSpeed: "Any speed",
  });
  const [profileUserId, setProfileUserId] = useState(null);
  const [profileMetadata, setProfileMetadata] = useState({});
  const [profileReady, setProfileReady] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState(() => localStorage.getItem("ev-emergency-name") || "");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(() => localStorage.getItem("ev-emergency-phone") || "");
  const [emergencyLocationMessage, setEmergencyLocationMessage] = useState("Location has not been shared yet.");
  const [emergencyCoordinates, setEmergencyCoordinates] = useState(null);
  const [emergencySavedMessage, setEmergencySavedMessage] = useState("");
  const [carbonDistanceKm, setCarbonDistanceKm] = useState(() => Number(localStorage.getItem("ev-carbon-distance-km")) || 1000);
  const [carbonPetrolMileage, setCarbonPetrolMileage] = useState(15);
  const [carbonPetrolPrice, setCarbonPetrolPrice] = useState(105);
  const [carbonEvConsumption, setCarbonEvConsumption] = useState(0.15);
  const [notificationSettings, setNotificationSettings] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("ev-notification-settings") || "{}");
      return { lowBattery: saved.lowBattery ?? true, bookingReminders: saved.bookingReminders ?? true, chargingReminders: saved.chargingReminders ?? true, browserNotifications: saved.browserNotifications ?? false };
    } catch { return { lowBattery: true, bookingReminders: true, chargingReminders: true, browserNotifications: false }; }
  });
  const [notificationItems, setNotificationItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ev-notification-items") || "[]"); } catch { return []; }
  });
  const [notificationStatus, setNotificationStatus] = useState("");
  const [favoriteStations, setFavoriteStations] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ev-favorite-stations") || "[]"); } catch { return []; }
  });
  const [recentStations, setRecentStations] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ev-recent-stations") || "[]"); } catch { return []; }
  });
  const [favoriteStatus, setFavoriteStatus] = useState("");
  const [gamification, setGamification] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("ev-gamification") || "{}");
      return {
        xp: Number(saved.xp) || 0,
        completedChallenges: Array.isArray(saved.completedChallenges) ? saved.completedChallenges : [],
        unlockedBadges: Array.isArray(saved.unlockedBadges) ? saved.unlockedBadges : [],
      };
    } catch { return { xp: 0, completedChallenges: [], unlockedBadges: [] }; }
  });
  const [gamificationMessage, setGamificationMessage] = useState("");
  const [lastLowBatteryAlert, setLastLowBatteryAlert] = useState(false);
  const [trackingLocation, setTrackingLocation] = useState(null);
  const [locationMessage, setLocationMessage] = useState("Allow location access to calculate your distance to a station.");
  const [trackingBattery, setTrackingBattery] = useState(65);
  const [fullRange, setFullRange] = useState(300);
  const [destinationId, setDestinationId] = useState(1);
  const [chargingStatus, setChargingStatus] = useState("not-charging");
  const [chargeStartBattery, setChargeStartBattery] = useState(65);
  const [comparisonEnergy, setComparisonEnergy] = useState(10);
  const [routeStart, setRouteStart] = useState("Bengaluru");
  const [routeEnd, setRouteEnd] = useState("Mysuru");
  const [routeDistance, setRouteDistance] = useState(145);
  const [routeBattery, setRouteBattery] = useState(80);
  const [routeFullRange, setRouteFullRange] = useState(300);
  const [routeConsumption, setRouteConsumption] = useState(0.15);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantListening, setAssistantListening] = useState(false);
  const [assistantVoiceStatus, setAssistantVoiceStatus] = useState("Voice is off. Start listening once, then speak naturally.");
  const speechRecognitionRef = useRef(null);
  const shouldKeepListeningRef = useRef(false);
  const [assistantMessages, setAssistantMessages] = useState([
    { role: "assistant", text: "Hi! I’m your EV Navigator assistant. Ask me about charging costs, battery range, connectors, or demo bookings." },
  ]);

  useEffect(() => {
    let active = true;
    async function loadSavedProfile() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        const user = data?.user;
        if (!active) return;
        if (!user) {
          setProfileMessage("Please sign in again to load your profile.");
          setProfileReady(true);
          return;
        }
        const metadata = user.user_metadata || {};
        setProfileUserId(user.id);
        setProfileMetadata(metadata);
        setProfileName(metadata.profile_name ?? metadata.full_name ?? metadata.name ?? "");
        setProfileEmail(metadata.profile_contact_email ?? user.email ?? "");
        setProfilePhone(metadata.profile_contact_phone ?? user.phone ?? "");
        const savedVehicles = Array.isArray(metadata.ev_vehicles) ? metadata.ev_vehicles : [];
        setVehicles(savedVehicles);
        setPrimaryVehicleId(metadata.primary_vehicle_id ?? savedVehicles.find((vehicle) => vehicle.isPrimary)?.id ?? savedVehicles[0]?.id ?? null);
      } catch (error) {
        if (active) setProfileMessage(error?.message || "Could not load your saved profile.");
      } finally {
        if (active) setProfileReady(true);
      }
    }
    loadSavedProfile();
    return () => { active = false; };
  }, []);

  function updateVehicleDraft(field, value) {
    setVehicleDraft((current) => ({ ...current, [field]: value }));
    setProfileSaved(false);
    setProfileMessage("");
  }

  function editVehicle(vehicle) {
    setEditingVehicleId(vehicle.id);
    setVehicleDraft({
      category: vehicle.category || "2w",
      model: vehicle.model || "",
      customName: vehicle.customName || "",
      photoUrl: vehicle.photoUrl || "",
      registration: vehicle.registration || "",
      batteryCapacity: vehicle.batteryCapacity || "",
      connector: vehicle.connector || "Type 2",
      rangeKm: vehicle.rangeKm || "",
      preferredChargeLimit: vehicle.preferredChargeLimit || "80",
      preferredChargingSpeed: vehicle.preferredChargingSpeed || "Any speed",
    });
    setProfileSaved(false);
    setProfileMessage(`Editing ${vehicle.model}. Update the fields and save the vehicle.`);
    document.querySelector(".vehicle-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cancelVehicleEdit() {
    setEditingVehicleId(null);
    setVehicleDraft({ category: "2w", model: "", customName: "", photoUrl: "", registration: "", batteryCapacity: "", connector: "Type 2", rangeKm: "", preferredChargeLimit: "80", preferredChargingSpeed: "Any speed" });
    setProfileMessage("");
  }

  function addVehicle(event) {
    event.preventDefault();
    const model = vehicleDraft.model.trim();
    if (!model) {
      setProfileMessage("Add a vehicle model or name before adding it.");
      return;
    }
    const vehicle = {
      id: editingVehicleId || globalThis.crypto?.randomUUID?.() || `vehicle-${Date.now()}`,
      category: vehicleDraft.category,
      model,
      customName: vehicleDraft.customName.trim(),
      photoUrl: vehicleDraft.photoUrl.trim(),
      registration: vehicleDraft.registration.trim(),
      batteryCapacity: vehicleDraft.batteryCapacity.trim(),
      connector: vehicleDraft.connector,
      rangeKm: vehicleDraft.rangeKm.trim(),
      preferredChargeLimit: vehicleDraft.preferredChargeLimit,
      preferredChargingSpeed: vehicleDraft.preferredChargingSpeed,
    };
    if (editingVehicleId) {
      setVehicles((current) => current.map((item) => item.id === editingVehicleId ? { ...item, ...vehicle } : item));
      setProfileMessage(`${model} updated. Select Save profile & vehicles to sync your changes.`);
      setEditingVehicleId(null);
    } else {
      setVehicles((current) => [...current, vehicle]);
      setPrimaryVehicleId((current) => current || vehicle.id);
      setProfileMessage(`${vehicle.category === "2w" ? "Two-wheeler" : "Four-wheeler"} added to your garage. Select Save profile & vehicles to sync your changes.`);
    }
    setVehicleDraft({ category: "2w", model: "", customName: "", photoUrl: "", registration: "", batteryCapacity: "", connector: "Type 2", rangeKm: "", preferredChargeLimit: "80", preferredChargingSpeed: "Any speed" });
    setProfileSaved(false);
  }

  function removeVehicle(vehicleId) {
    const remaining = vehicles.filter((vehicle) => vehicle.id !== vehicleId);
    setVehicles(remaining);
    if (editingVehicleId === vehicleId) cancelVehicleEdit();
    if (primaryVehicleId === vehicleId) setPrimaryVehicleId(remaining[0]?.id ?? null);
    setProfileSaved(false);
    setProfileMessage("Vehicle removed from the list. Save your profile to sync this change.");
  }

  async function saveProfile(event) {
    event.preventDefault();
    if (!profileReady) {
      setProfileMessage("Your profile is still loading. Please wait a moment.");
      return;
    }
    if (!profileUserId) {
      setProfileMessage("We couldn't identify your signed-in account. Please sign out and sign in again.");
      return;
    }
    setProfileSaving(true);
    setProfileSaved(false);
    setProfileMessage("");
    const savedVehicles = vehicles.map((vehicle) => ({
      ...vehicle,
      isPrimary: vehicle.id === primaryVehicleId,
    }));
    const metadataToSave = {
      ...profileMetadata,
      profile_name: profileName.trim(),
      profile_contact_email: profileEmail.trim(),
      profile_contact_phone: profilePhone.trim(),
      ev_vehicles: savedVehicles,
      primary_vehicle_id: primaryVehicleId,
    };
    try {
      const { data, error } = await supabase.auth.updateUser({ data: metadataToSave });
      if (error) throw error;
      setProfileMetadata(data?.user?.user_metadata || metadataToSave);
      setVehicles(savedVehicles);
      try {
        localStorage.setItem(`evnavigator-profile-${profileUserId}`, JSON.stringify({
          name: profileName.trim(), email: profileEmail.trim(), phone: profilePhone.trim(),
          vehicles: savedVehicles, primaryVehicleId,
        }));
      } catch { /* Supabase metadata remains the persistent source if local storage is unavailable. */ }
      setProfileSaved(true);
      setProfileMessage("Profile and vehicle details saved to your EV Navigator account.");
    } catch (error) {
      setProfileMessage(error?.message || "Couldn't save your profile. Please try again.");
    } finally {
      setProfileSaving(false);
    }
  }

  function toggleFavoriteStation(station) {
    setFavoriteStations((current) => {
      const exists = current.some((item) => Number(item.id) === Number(station.id));
      const next = exists
        ? current.filter((item) => Number(item.id) !== Number(station.id))
        : [...current, { id: station.id, note: "" }];
      try { localStorage.setItem("ev-favorite-stations", JSON.stringify(next)); } catch { /* Favorites remain available for this session. */ }
      setFavoriteStatus(exists ? `${station.name} removed from favourites.` : `${station.name} saved to favourites.`);
      return next;
    });
  }

  function updateFavoriteNote(stationId, note) {
    setFavoriteStations((current) => {
      const next = current.map((item) => Number(item.id) === Number(stationId) ? { ...item, note } : item);
      try { localStorage.setItem("ev-favorite-stations", JSON.stringify(next)); } catch { /* Notes remain available for this session. */ }
      return next;
    });
  }

  function recordStationVisit(station) {
    setRecentStations((current) => {
      const next = [{ id: station.id, visitedAt: new Date().toISOString() }, ...current.filter((item) => Number(item.id) !== Number(station.id))].slice(0, 8);
      try { localStorage.setItem("ev-recent-stations", JSON.stringify(next)); } catch { /* Recent list remains available for this session. */ }
      return next;
    });
  }

  function pushNotification(title, body) {
    const item = { id: globalThis.crypto?.randomUUID?.() || `notice-${Date.now()}`, title, body, createdAt: new Date().toISOString(), read: false };
    setNotificationItems((current) => {
      const next = [item, ...current].slice(0, 30);
      try { localStorage.setItem("ev-notification-items", JSON.stringify(next)); } catch { /* In-app notice still works for this session. */ }
      return next;
    });
    if (notificationSettings.browserNotifications && "Notification" in window && Notification.permission === "granted") {
      try { new Notification(title, { body }); } catch { /* Browser notifications may be blocked by device settings. */ }
    }
  }

  function updateNotificationSetting(field, value) {
    setNotificationSettings((current) => {
      const next = { ...current, [field]: value };
      try { localStorage.setItem("ev-notification-settings", JSON.stringify(next)); } catch { /* Settings remain active for this session. */ }
      return next;
    });
  }

  async function enableBrowserNotifications() {
    if (!("Notification" in window)) {
      setNotificationStatus("This browser does not support desktop notifications. In-app notifications will still work.");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        updateNotificationSetting("browserNotifications", true);
        setNotificationStatus("Browser notifications enabled on this device.");
        pushNotification("EV Navigator notifications enabled", "You can receive supported reminders while this app is open.");
      } else {
        updateNotificationSetting("browserNotifications", false);
        setNotificationStatus("Permission was not granted. You can still see reminders inside EV Navigator.");
      }
    } catch {
      setNotificationStatus("Could not request browser permission. In-app reminders are still available.");
    }
  }

  function clearNotifications() {
    setNotificationItems([]);
    try { localStorage.removeItem("ev-notification-items"); } catch { /* Ignore storage errors. */ }
    setNotificationStatus("Notification history cleared.");
  }

  useEffect(() => {
    if (notificationSettings.lowBattery && Number(trackingBattery) <= 20 && !lastLowBatteryAlert) {
      pushNotification("Low battery warning", `Battery is at ${trackingBattery}%. Estimated range is ${Math.round(Number(fullRange) * Number(trackingBattery) / 100)} km. Check charging options before travelling.`);
      setLastLowBatteryAlert(true);
    } else if (Number(trackingBattery) > 20 && lastLowBatteryAlert) {
      setLastLowBatteryAlert(false);
    }
  }, [trackingBattery, fullRange, notificationSettings.lowBattery, lastLowBatteryAlert]);

  useEffect(() => {
    if (!notificationSettings.bookingReminders) return;
    const now = Date.now();
    bookings.forEach((booking) => {
      const bookingAt = new Date(`${booking.date}T${booking.time || "00:00"}`).getTime();
      if (Number.isFinite(bookingAt) && bookingAt > now && bookingAt - now <= 24 * 60 * 60 * 1000) {
        const key = `ev-booking-reminded-${booking.id}`;
        if (!localStorage.getItem(key)) {
          pushNotification("Upcoming demo booking", `${booking.name} is scheduled for ${booking.date} at ${booking.time}. This is a demo reminder, not a real charger reservation.`);
          localStorage.setItem(key, "1");
        }
      }
    });
  }, [bookings, notificationSettings.bookingReminders]);

  const destination = stations.find((station) => station.id === Number(destinationId)) || stations[0];
  const estimatedRange = Math.max(0, Number(fullRange) * Number(trackingBattery) / 100);
  const distanceToStation = trackingLocation && destination
    ? getDistanceKm(trackingLocation.lat, trackingLocation.lon, destination.lat, destination.lon)
    : null;
  const rangeAfterTrip = distanceToStation == null ? null : estimatedRange - distanceToStation;

  function getDistanceKm(lat1, lon1, lat2, lon2) {
    const toRad = (degrees) => degrees * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function locateVehicle() {
    if (!navigator.geolocation) {
      setLocationMessage("This browser does not support GPS location.");
      return;
    }
    setLocationMessage("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setTrackingLocation({ lat: position.coords.latitude, lon: position.coords.longitude });
        setLocationMessage(`Location updated · GPS accuracy about ${Math.round(position.coords.accuracy)} m`);
      },
      (error) => {
        const message = error.code === 1 ? "Location permission was denied. Allow location access in your browser settings." : error.code === 2 ? "Your location is currently unavailable. Try again outdoors." : "Location request timed out. Please try again.";
        setLocationMessage(message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  }

  function openStationRoute() {
    if (!destination) return;
    const origin = trackingLocation ? `${trackingLocation.lat},${trackingLocation.lon}` : "My+Location";
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${destination.lat},${destination.lon}&travelmode=driving`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function toggleCharging() {
    if (chargingStatus === "charging") {
      setChargingStatus("not-charging");
    } else {
      setChargeStartBattery(trackingBattery);
      setChargingStatus("charging");
    }
  }

  const energy = Math.max(0, capacity * (target - battery) / 100);
  const cost = energy * price;

  const filtered = stations.filter(
    (station) =>
      station.name.toLowerCase().includes(search.toLowerCase()) ||
      station.location.toLowerCase().includes(search.toLowerCase())
  );

  function answerAssistantQuestion(rawQuestion, speakResponse = false) {
    const question = rawQuestion.trim();
    if (!question) return;
    const q = question.toLowerCase();
    let answer = "I can help with charging prices, charging cost, battery range, connector types, nearby sample stations, and demo bookings. Try asking: ‘Which station is cheapest?’";

    if ((q.includes("cheap") || q.includes("lowest") || q.includes("price")) && (q.includes("station") || q.includes("charge") || q.includes("cost") || q.includes("near"))) {
      const cheapest = [...stations].sort((a, b) => a.price - b.price)[0];
      answer = `${cheapest.name} in ${cheapest.location} has the lowest sample rate in this demo: ₹${cheapest.price}/kWh. For ${comparisonEnergy} kWh, the estimated cost is ₹${(cheapest.price * comparisonEnergy).toFixed(2)}. These are sample rates, not live verified prices.`;
    } else if (q.includes("cost") || q.includes("how much") || q.includes("₹") || q.includes("rupee")) {
      const match = q.match(/(\d+(?:\.\d+)?)\s*kwh/);
      const energyAmount = match ? Number(match[1]) : comparisonEnergy;
      const cheapest = [...stations].sort((a, b) => a.price - b.price)[0];
      answer = `For ${energyAmount} kWh, estimated costs using the sample rates are: ${[...stations].sort((a,b)=>a.price-b.price).map(station => `${station.name}: ₹${(station.price * energyAmount).toFixed(2)} (₹${station.price}/kWh)`).join("; ")}. Cheapest sample option: ${cheapest.name}. Actual tariffs may differ.`;
    } else if (q.includes("range") || q.includes("reach") || q.includes("battery") || q.includes("mysuru") || q.includes("distance")) {
      const percentMatch = q.match(/(\d+(?:\.\d+)?)\s*%/);
      const rangeMatch = q.match(/(\d+(?:\.\d+)?)\s*km/);
      const batteryPercent = percentMatch ? Number(percentMatch[1]) : Number(trackingBattery);
      const fullRangeMatch = q.match(/(?:range|full range|vehicle range)[^\d]{0,20}(\d+(?:\.\d+)?)/);
      const vehicleRange = fullRangeMatch ? Number(fullRangeMatch[1]) : Number(fullRange);
      const available = Math.max(0, vehicleRange * batteryPercent / 100);
      const requestedDistance = rangeMatch ? Number(rangeMatch[1]) : (q.includes("mysuru") ? 145 : null);
      answer = requestedDistance == null
        ? `With ${batteryPercent}% battery and a full-charge range of ${vehicleRange} km, your estimated available range is ${available.toFixed(0)} km. This is an estimate based on the values entered in Smart Mode, not live vehicle data.`
        : `At ${batteryPercent}% battery and a full-charge range of ${vehicleRange} km, your estimated range is ${available.toFixed(0)} km. The trip distance you mentioned is about ${requestedDistance} km, so ${available >= requestedDistance ? "it appears within the estimated range, but keep a safety buffer" : "your estimated range is insufficient; plan a charging stop before travelling"}. For Mysuru, verify the actual road distance in a maps app.`;
    } else if (q.includes("connector") || q.includes("plug") || q.includes("type 2") || q.includes("ccs")) {
      const primary = vehicles.find((vehicle) => String(vehicle.id) === String(primaryVehicleId)) || vehicles[0];
      answer = primary
        ? `Your saved ${primary.customName || primary.model || "primary vehicle"} lists ${primary.connector || "no connector saved"} as its connector. Sample stations in this demo list: ${[...new Set(stations.map(station => station.connector))].join(", ")}. Check your vehicle manual and the station operator before connecting.`
        : `Your profile doesn’t have a vehicle saved yet. Add your EV in My Profile to store its connector. The sample stations in this demo list ${[...new Set(stations.map(station => station.connector))].join(", ")}. Confirm compatibility with your vehicle manual before charging.`;
    } else if (q.includes("book") || q.includes("reservation") || q.includes("slot")) {
      answer = "You can open Bookings from the sidebar, choose a sample station, then select a date, time, connector, and saved vehicle. It creates a demo booking only; it does not reserve a real charger with an operator.";
    } else if (q.includes("station") || q.includes("nearby") || q.includes("near me")) {
      answer = `The demo currently contains these sample stations: ${stations.map(station => `${station.name} (${station.location}, ₹${station.price}/kWh)`).join("; ")}. These are fixed sample entries, not live GPS results or verified availability. Open Map to explore them.`;
    }

    setAssistantMessages((old) => [...old, { role: "user", text: question }, { role: "assistant", text: answer }]);
    setAssistantInput("");
    if (speakResponse && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(answer);
      utterance.lang = "en-IN";
      utterance.rate = 1;
      window.speechSynthesis.speak(utterance);
    }
    return answer;
  }

  function stopAssistantListening() {
    shouldKeepListeningRef.current = false;
    setAssistantListening(false);
    setAssistantVoiceStatus("Voice listening stopped.");
    if (speechRecognitionRef.current) speechRecognitionRef.current.stop();
  }

  function startAssistantListening() {
    const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionApi) {
      setAssistantVoiceStatus("Voice recognition is not supported in this browser. Try Google Chrome or Microsoft Edge.");
      return;
    }
    if (speechRecognitionRef.current && assistantListening) return;

    const recognition = new SpeechRecognitionApi();
    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    speechRecognitionRef.current = recognition;
    shouldKeepListeningRef.current = true;
    setAssistantListening(true);
    setAssistantVoiceStatus("Listening… speak naturally. You can ask multiple questions without pressing the button again.");

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0]?.transcript?.trim() || "";
        if (event.results[i].isFinal) finalText += `${transcript} `;
        else interimText += `${transcript} `;
      }
      if (interimText.trim()) setAssistantVoiceStatus(`Hearing: “${interimText.trim()}”`);
      if (finalText.trim()) {
        const spokenQuestion = finalText.trim();
        if (/^(stop listening|stop voice|turn off voice)$/i.test(spokenQuestion.replace(/[.!?]+$/, ""))) {
          stopAssistantListening();
          return;
        }
        setAssistantInput(spokenQuestion);
        answerAssistantQuestion(spokenQuestion, true);
        setAssistantVoiceStatus("Answered. Keep speaking to ask another question, or say “stop listening”.");
      }
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        shouldKeepListeningRef.current = false;
        setAssistantListening(false);
        setAssistantVoiceStatus("Microphone access was blocked. Allow microphone access in your browser settings and try again.");
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        setAssistantVoiceStatus(`Voice recognition issue: ${event.error}. You can continue typing or restart listening.`);
      }
    };
    recognition.onend = () => {
      if (shouldKeepListeningRef.current) {
        try { recognition.start(); }
        catch { /* The browser may already be restarting recognition. */ }
      } else {
        setAssistantListening(false);
      }
    };
    try {
      recognition.start();
    } catch {
      shouldKeepListeningRef.current = false;
      setAssistantListening(false);
      setAssistantVoiceStatus("Could not start the microphone. Please try again.");
    }
  }

  useEffect(() => () => {
    shouldKeepListeningRef.current = false;
    if (speechRecognitionRef.current) speechRecognitionRef.current.stop();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  function bookStation(station) {
    setBookingStation(station);
    setBookingDate((current) => current || new Date().toISOString().slice(0, 10));
    setBookingTime("10:00");
    setBookingConnector(station.connector || "CCS2");
    setBookingVehicleId(primaryVehicleId ? String(primaryVehicleId) : (vehicles[0] ? String(vehicles[0].id) : ""));
    setBookingMessage("");
    setSelected(null);
    setPage("Bookings");
  }

  function confirmDemoBooking(event) {
    event.preventDefault();
    if (!bookingStation) return;
    const chosenVehicle = vehicles.find((vehicle) => String(vehicle.id) === String(bookingVehicleId));
    const booking = {
      id: globalThis.crypto?.randomUUID?.() || `booking-${Date.now()}`,
      stationId: bookingStation.id,
      name: bookingStation.name,
      location: bookingStation.location,
      date: bookingDate,
      time: bookingTime,
      connector: bookingConnector,
      vehicleName: chosenVehicle ? (chosenVehicle.customName || chosenVehicle.model || "My EV") : "Vehicle not selected",
      status: "Demo booking",
    };
    setBookings((old) => [booking, ...old]);
    setBookingMessage("Demo booking created. This does not reserve a real charger.");
    setBookingStation(null);
  }

  function completeGreenChallenge(challenge) {
    setGamification((current) => {
      if (current.completedChallenges.includes(challenge.id)) {
        setGamificationMessage("You've already completed this challenge. Keep going! 💚");
        return current;
      }
      const nextCompleted = [...current.completedChallenges, challenge.id];
      const nextXp = current.xp + challenge.xp;
      const badgeRules = [
        { id: "first-step", name: "First Green Step", condition: nextCompleted.length >= 1 },
        { id: "eco-explorer", name: "Eco Explorer", condition: favoriteStations.length >= 1 || nextCompleted.length >= 3 },
        { id: "charging-planner", name: "Charging Planner", condition: bookings.length >= 1 || nextCompleted.includes("plan-trip") },
        { id: "green-champion", name: "Green Champion", condition: nextXp >= 200 },
      ];
      const nextBadges = [...new Set([...current.unlockedBadges, ...badgeRules.filter((badge) => badge.condition).map((badge) => badge.id)])];
      const next = { xp: nextXp, completedChallenges: nextCompleted, unlockedBadges: nextBadges };
      localStorage.setItem("ev-gamification", JSON.stringify(next));
      setGamificationMessage(`Challenge completed! +${challenge.xp} XP earned. 🏆`);
      return next;
    });
  }

  return (
    <div className="app">
      <main className="main">
        <header className="topbar topbar-modern">
          <div className="topbar-brand">
            <div className="logo">⚡</div>
            <div><strong>EV Navigator</strong><small>SMART CHARGING</small></div>
          </div>
          <nav className="ev-primary-nav" aria-label="Main navigation">
            {["Explore", "Map", "Route Planner", "AI Assistant"].map((item) => (
              <button key={item} type="button" className={`ev-nav-link ${page === item ? "active" : ""}`} onClick={() => { setPage(item); setToolsOpen(false); }} aria-current={page === item ? "page" : undefined}>
                <span className="ev-nav-link-icon">{item === "Explore" ? "⌂" : item === "Map" ? "⌖" : item === "Route Planner" ? "↗" : "✧"}</span>{item}
              </button>
            ))}
          </nav>
          <div className="topbar-navigation">
            <button
              type="button"
              className={`tools-menu-trigger ${toolsOpen ? "open" : ""}`}
              onClick={() => setToolsOpen((open) => !open)}
              aria-expanded={toolsOpen}
              aria-controls="ev-tools-menu"
            >
              <span className="tools-trigger-icon">☷</span>
              <span>Tools</span>
              <span className="tools-trigger-count">11</span>
              <span className="tools-trigger-chevron">{toolsOpen ? "⌃" : "⌄"}</span>
            </button>
            {toolsOpen && (
              <div className="ev-tools-popover" id="ev-tools-menu">
                <div className="tools-popover-heading">
                  <div><strong>EV Toolkit</strong><small>Helpful controls, all in one place</small></div>
                  <button type="button" className="tools-close" onClick={() => setToolsOpen(false)} aria-label="Close tools menu">×</button>
                </div>
                <div className="tools-popover-grid">
                  <div className="tools-group">
                    <span className="tools-group-label">PLAN & CHARGE</span>
                    {[
                      ["Smart Mode", "✦", "Personalized charging"],
                      ["Calculator", "₹", "Estimate charging cost"],
                      ["Cost Compare", "⇄", "Compare charging prices"],
                      ["Route Planner", "↗", "Plan a battery-aware trip"],
                      ["Bookings", "▤", "Your saved bookings"],
                    ].map(([item, icon, detail]) => <button type="button" className={`tools-menu-item ${page === item ? "selected" : ""}`} key={item} onClick={() => { setPage(item); setToolsOpen(false); }}><span className="tools-item-icon">{icon}</span><span><strong>{item}</strong><small>{detail}</small></span><b>↗</b></button>)}
                  </div>
                  <div className="tools-group">
                    <span className="tools-group-label">YOUR EV & ACCOUNT</span>
                    {[
                      ["Tracking", "◎", "Battery and GPS range"],
                      ["Profile", "◉", "Your vehicles and details"],
                      ["Favourite Stations", "☆", "Your charging shortlist"],
                      ["Notifications", "♧", "Alerts and reminders"],
                    ].map(([item, icon, detail]) => <button type="button" className={`tools-menu-item ${page === item ? "selected" : ""}`} key={item} onClick={() => { setPage(item); setToolsOpen(false); }}><span className="tools-item-icon">{icon}</span><span><strong>{item}</strong><small>{detail}</small></span><b>↗</b></button>)}
                  </div>
                  <div className="tools-group">
                    <span className="tools-group-label">SAFETY & IMPACT</span>
                    {[
                      ["Emergency Assistance", "✚", "Contacts and roadside help"],
                      ["Carbon Savings", "♧", "Estimate your green impact"],
                      ["Gamification", "🏆", "Challenges and achievements"],
                    ].map(([item, icon, detail]) => <button type="button" className={`tools-menu-item ${page === item ? "selected" : ""}`} key={item} onClick={() => { setPage(item); setToolsOpen(false); }}><span className="tools-item-icon">{icon}</span><span><strong>{item}</strong><small>{detail}</small></span><b>↗</b></button>)}
                  </div>
                </div>
                <div className="tools-popover-footer"><span className="nav-status-dot" /> Your key controls are also built into the Explore dashboard.</div>
              </div>
            )}
          </div>
          <span className="badge"><span className="nav-status-dot" /> ELECTRIC MOBILITY</span>
        </header>

        {page === "Explore" && (
          <>
            <section className="command-hud" aria-label="EV command dashboard">
              <div className="hud-heading">
                <div>
                  <p className="eyebrow">EV NAVIGATOR · COMMAND CENTER</p>
                  <h2>Your electric journey, under control</h2>
                  <p className="hud-subtitle">A quick view of your vehicle energy and charging tools.</p>
                </div>
                <span className="system-status"><span className="status-pulse" /> SYSTEM READY</span>
              </div>

              <div className="hud-grid">
                <article className="hud-card battery-hud">
                  <div className="hud-card-top">
                    <span className="hud-kicker">BATTERY MONITOR</span>
                    <span className="hud-icon">ϟ</span>
                  </div>
                  <div className="battery-hud-content">
                    <div className="battery-ring" style={{ "--battery-level": `${trackingBattery}%` }}>
                      <div className="battery-ring-inner">
                        <span className="battery-bolt">⚡</span>
                        <strong>{trackingBattery}<small>%</small></strong>
                        <span>BATTERY</span>
                      </div>
                    </div>
                    <div className="battery-hud-copy">
                      <span className="hud-muted">Estimated available range</span>
                      <strong className="hud-range">{estimatedRange.toFixed(0)} <small>km</small></strong>
                      <span className="hud-status"><span className="status-pulse" /> {chargingStatus === "charging" ? "Charging demo active" : "Ready for your next trip"}</span>
                      <button className="hud-text-button" onClick={() => setPage("Tracking")}>Open battery controls ↗</button>
                    </div>
                  </div>
                  <div className="hud-meter"><span style={{ width: `${trackingBattery}%` }} /></div>
                  <div className="hud-meter-labels"><span>0%</span><span>ENERGY LEVEL</span><span>100%</span></div>
                </article>

                <article className="hud-card route-hud">
                  <div className="hud-card-top">
                    <span className="hud-kicker">CHARGING NETWORK</span>
                    <span className="hud-icon">⌖</span>
                  </div>
                  <div className="route-visual">
                    <div className="route-orbit route-orbit-one" />
                    <div className="route-orbit route-orbit-two" />
                    <div className="route-center">⌖</div>
                    <span className="route-node route-node-one">⚡</span>
                    <span className="route-node route-node-two">⚡</span>
                    <span className="route-node route-node-three">⚡</span>
                  </div>
                  <div className="route-summary">
                    <div><strong>{stations.length.toString().padStart(2, "0")}</strong><span>Demo stations</span></div>
                    <div><strong>{stations.filter((station) => parseInt(station.power, 10) >= 50).length.toString().padStart(2, "0")}</strong><span>Fast chargers*</span></div>
                  </div>
                  <button className="hud-action" onClick={() => setPage("Map")}>Explore live map <span>↗</span></button>
                  <small className="hud-footnote">*Based on sample listings; map data may differ.</small>
                </article>

                <article className="hud-card energy-hud">
                  <div className="hud-card-top">
                    <span className="hud-kicker">ENERGY PLANNER</span>
                    <span className="hud-icon">₹</span>
                  </div>
                  <div className="energy-amount">₹{cost.toFixed(0)}<span> estimated</span></div>
                  <p className="energy-description">Approximate cost to charge from {battery}% to {target}% using your current calculator settings.</p>
                  <div className="energy-visual" aria-hidden="true">
                    {Array.from({ length: 24 }, (_, index) => (
                      <span key={index} style={{ "--bar-index": index, "--bar-height": `${16 + ((index * 17) % 48)}px` }} />
                    ))}
                  </div>
                  <div className="energy-meta"><span>Energy needed</span><strong>{energy.toFixed(1)} kWh</strong></div>
                  <button className="hud-action secondary" onClick={() => setPage("Calculator")}>Open cost calculator <span>↗</span></button>
                </article>
              </div>

              <div className="hud-quick-actions">
                <span className="quick-label">QUICK ACCESS</span>
                <button onClick={() => setPage("Tracking")}><span>◎</span><span><strong>Vehicle tracking</strong><small>Range & GPS</small></span><b>↗</b></button>
                <button onClick={() => setPage("Profile")}><span>◉</span><span><strong>My profile</strong><small>Personal & vehicle details</small></span><b>↗</b></button>
                <button onClick={() => setPage("Bookings")}><span>▤</span><span><strong>Bookings</strong><small>{bookings.length} saved</small></span><b>↗</b></button>
              </div>

              <div className="dashboard-utility-strip" aria-label="Integrated EV utilities">
                <div className="dashboard-utility-intro"><span className="utility-live-mark" /> <span><strong>Built-in utilities</strong><small>Useful at a glance — no extra dashboard to open</small></span></div>
                <button type="button" onClick={() => setPage("Carbon Savings")}><span>🌱</span><span><strong>Green impact</strong><small>CO₂ savings</small></span><b>↗</b></button>
                <button type="button" onClick={() => setPage("Favourite Stations")}><span>☆</span><span><strong>Favourites</strong><small>{favoriteStations.length} saved</small></span><b>↗</b></button>
                <button type="button" onClick={() => setPage("Notifications")}><span>♧</span><span><strong>Alerts</strong><small>Battery & bookings</small></span><b>↗</b></button>
                <button type="button" onClick={() => setPage("Emergency Assistance")}><span>✚</span><span><strong>Safety</strong><small>Emergency help</small></span><b>↗</b></button>
              </div>
            </section>

            <section className="hero">
              <div>
                <p className="eyebrow">THE FUTURE IS ELECTRIC</p>
                <h1>
                  Charge smarter.
                  <br />
                  <span>Travel farther.</span>
                </h1>
                <p className="hero-description">
                  Find charging stations, estimate costs, and plan your next
                  electric journey.
                </p>
                <button
                  className="primary-button"
                  onClick={() =>
                    document.getElementById("stations").scrollIntoView({
                      behavior: "smooth",
                    })
                  }
                >
                  Explore stations ↗
                </button>
              </div>

              <div className="hero-art">
                <div className="orbit">⚡</div>
                <div className="electric-car">🚙</div>
                <div className="art-label">POWER YOUR JOURNEY</div>
              </div>
            </section>

            <section className="stats">
              <div className="stat">
                <span>⚡</span>
                <div>
                  <p>Listed stations</p>
                  <h2>{stations.length}</h2>
                </div>
              </div>
              <div className="stat">
                <span>🔋</span>
                <div>
                  <p>Fast chargers</p>
                  <h2>{stations.filter((s) => parseInt(s.power) >= 50).length}</h2>
                </div>
              </div>
              <div className="stat">
                <span>₹</span>
                <div>
                  <p>Starting price</p>
                  <h2>₹12/kWh</h2>
                </div>
              </div>
              <div className="stat">
                <span>▣</span>
                <div>
                  <p>My bookings</p>
                  <h2>{bookings.length}</h2>
                </div>
              </div>
            </section>

            <section className="stations" id="stations">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">DISCOVER YOUR NEXT CHARGE</p>
                  <h2>Charging stations</h2>
                  <p>Explore sample cards here; open Map for mapped station records from OpenStreetMap.</p>
                </div>
                <span className="badge">{filtered.length} sample listings</span>
              </div>

              <div className="search-wrapper">
                <span>⌕</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search station or location..."
                />
              </div>

              <div className="station-grid">
                {filtered.map((station) => (
                  <article className="station-card" key={station.id}>
                    <div className="station-art">
                      <span className="station-symbol">ϟ</span>
                      <span className="power">{station.power}</span>
                      <span className="sample">SAMPLE DATA</span>
                    </div>

                    <div className="station-info">
                      <h3>{station.name}</h3>
                      <p className="location">⌖ {station.location}</p>

                      <div className="tags">
                        <span>{station.connector}</span>
                        <span>{station.power}</span>
                      </div>

                      <div className="station-bottom">
                        <div>
                          <strong>₹{station.price}</strong>
                          <small>/kWh</small>
                        </div>
                        <button
                          className="outline-button"
                          onClick={() => {
                            setSelected(station);
                            setPrice(station.price);
                            recordStationVisit(station);
                          }}
                        >
                          View details ↗
                        </button>
                        <button className="outline-button" type="button" onClick={() => toggleFavoriteStation(station)} aria-pressed={favoriteStations.some((item) => Number(item.id) === Number(station.id))} style={{ marginLeft: 8 }}>
                          {favoriteStations.some((item) => Number(item.id) === Number(station.id)) ? "★ Saved" : "☆ Favourite"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {filtered.length === 0 && (
                <p className="empty">No stations found. Try another search.</p>
              )}
            </section>
          </>
        )}

        {page === "AI Assistant" && (
          <section className="page">
            <p className="eyebrow">EV NAVIGATOR · RULE-BASED DEMO</p>
            <h1>AI EV Assistant 🤖</h1>
            <p>Ask about sample station prices, estimated battery range, connectors, or demo bookings.</p>
            <div className="profile-card" style={{ maxWidth: 900, marginTop: 24 }}>
              <div className="profile-card-heading"><span className="profile-avatar">🤖</span><div><h2>Your EV helper</h2><p>Talk naturally or type. Start voice listening once, then ask follow-up questions hands-free.</p></div></div>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginTop: 16 }}>
                {!assistantListening ? (
                  <button className="primary-button" type="button" onClick={startAssistantListening}>🎙️ Start voice listening</button>
                ) : (
                  <button className="outline-button" type="button" onClick={stopAssistantListening}>⏹ Stop listening</button>
                )}
                <span role="status" aria-live="polite" style={{ fontSize: 14, color: "var(--muted, #667085)" }}>{assistantVoiceStatus}</span>
              </div>
              <p style={{ fontSize: 13, marginTop: 8 }}>Tip: after starting once, ask multiple questions. Say “stop listening” to turn the microphone off. Your browser will ask for microphone permission.</p>
              <div className="assistant-chat" aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 420, overflowY: "auto", padding: "18px 0" }}>
                {assistantMessages.map((message, index) => (
                  <div key={`${message.role}-${index}`} style={{ alignSelf: message.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%", padding: "12px 15px", borderRadius: 14, background: "#050805", border: message.role === "user" ? "1px solid #39ff14" : "1px solid #1e7a16", boxShadow: message.role === "user" ? "0 0 12px rgba(57,255,20,0.18)" : "0 0 8px rgba(57,255,20,0.08)", color: "#39ff14", whiteSpace: "pre-wrap" }}>
                    <strong style={{ display: "block", fontSize: 12, marginBottom: 5 }}>{message.role === "user" ? "YOU" : "EV ASSISTANT"}</strong>
                    {message.text}
                  </div>
                ))}
              </div>
              <form onSubmit={(event) => { event.preventDefault(); answerAssistantQuestion(assistantInput); }} style={{ display: "flex", gap: 10, alignItems: "stretch", flexWrap: "wrap" }}>
                <input aria-label="Ask the EV assistant" value={assistantInput} onChange={(event) => setAssistantInput(event.target.value)} placeholder="e.g. Can I reach Mysuru with 35% battery?" style={{ flex: "1 1 280px", minWidth: 0 }} />
                <button className="primary-button" type="submit" disabled={!assistantInput.trim()}>Ask assistant ↗</button>
              </form>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
                {["Which station is cheapest?", "How much will 20 kWh cost?", "Can I reach Mysuru with 35% battery?", "Which connector does my vehicle need?", "How do I book a slot?"].map((question) => (
                  <button key={question} type="button" className="outline-button" onClick={() => answerAssistantQuestion(question)}>{question}</button>
                ))}
              </div>
            </div>
            <p className="smart-disclaimer">Prototype notice: voice input and spoken replies are enabled, but answers are still rule-based—not a general-purpose connected AI. It uses fixed sample station data and manually entered battery/range values. To answer arbitrary questions reliably, connect an AI API through a secure backend; do not put a secret API key in frontend code.</p>
          </section>
        )}

        {page === "Smart Mode" && (
          <section className="page smart-mode-page">
            <div className="smart-mode-hero">
              <div>
                <p className="eyebrow">EV NAVIGATOR · SMART MODE</p>
                <h1>Your journey, intelligently planned.</h1>
                <p>Get a quick battery check, see charging options, and decide whether to charge before you travel.</p>
                <span className="smart-live-pill"><span /> PERSONAL EV SNAPSHOT</span>
              </div>
              <div className="smart-hero-icon" aria-hidden="true"><span>⚡</span><small>SMART<br />ENERGY</small></div>
            </div>

            <div className="smart-mode-grid">
              <article className="smart-panel smart-battery-panel">
                <div className="smart-panel-top"><span className="smart-panel-icon">🔋</span><span className="smart-chip">MANUAL / DEMO DATA</span></div>
                <p className="smart-label">Current battery level</p>
                <div className="smart-battery-number">{trackingBattery}<small>%</small></div>
                <div className="smart-progress"><span style={{ width: `${trackingBattery}%` }} /></div>
                <input aria-label="Smart Mode battery percentage" className="smart-range-input" type="range" min="0" max="100" value={trackingBattery} onChange={(event) => setTrackingBattery(Number(event.target.value))} />
                <div className="smart-metric-row"><span>Estimated available range</span><strong>{estimatedRange.toFixed(0)} km</strong></div>
                <div className={`smart-recommendation ${trackingBattery <= 20 ? "is-warning" : ""}`}>
                  <span>{trackingBattery <= 20 ? "⚠" : "✓"}</span>
                  <div><strong>{trackingBattery <= 20 ? "Charging recommended" : trackingBattery <= 40 ? "Plan a charging stop" : "You have a useful range buffer"}</strong><p>{trackingBattery <= 20 ? "Find a suitable charger before starting a longer trip." : trackingBattery <= 40 ? "Check chargers along your route before travelling." : "Check the destination and road conditions before departure."}</p></div>
                </div>
              </article>

              <article className="smart-panel">
                <div className="smart-panel-top"><span className="smart-panel-icon">🚘</span><span className="smart-chip">YOUR GARAGE</span></div>
                <h2>Travel profile</h2>
                {vehicles.length > 0 ? (
                  <>
                    <p className="smart-muted">Primary vehicle saved in your profile</p>
                    <div className="smart-vehicle-card"><span className="smart-vehicle-emoji">{(vehicles.find((vehicle) => vehicle.id === primaryVehicleId) || vehicles[0]).category === "2w" ? "🛵" : "🚙"}</span><div><strong>{(vehicles.find((vehicle) => vehicle.id === primaryVehicleId) || vehicles[0]).model}</strong><small>{(vehicles.find((vehicle) => vehicle.id === primaryVehicleId) || vehicles[0]).category === "2w" ? "Two-wheeler" : "Four-wheeler"}</small></div></div>
                    <div className="smart-metric-row"><span>Vehicle's listed range</span><strong>{(vehicles.find((vehicle) => vehicle.id === primaryVehicleId) || vehicles[0]).rangeKm ? `${(vehicles.find((vehicle) => vehicle.id === primaryVehicleId) || vehicles[0]).rangeKm} km` : `${fullRange} km (estimate)`}</strong></div>
                  </>
                ) : (
                  <div className="smart-empty-garage"><span>＋</span><strong>Add your EV to personalise Smart Mode</strong><p>Save a two-wheeler, four-wheeler, or both in My Profile.</p><button className="primary-button" onClick={() => setPage("Profile")}>Open My Profile ↗</button></div>
                )}
                <button className="outline-button full" onClick={() => setPage("Tracking")}>Open battery & GPS tools ↗</button>
              </article>

              <article className="smart-panel smart-stations-panel">
                <div className="smart-panel-top"><span className="smart-panel-icon">📍</span><span className="smart-chip">CHARGING OPTIONS</span></div>
                <h2>Charging stations to consider</h2>
                <p className="smart-muted">Sample station listings. Distances and availability are not live unless connected to a verified data source.</p>
                {stations.slice().sort((a, b) => a.price - b.price).slice(0, 3).map((station) => (
                  <div className="smart-station-row" key={station.id}><span className="smart-station-bolt">⚡</span><div className="smart-station-copy"><strong>{station.name}</strong><small>{station.location} · {station.power}</small></div><div className="smart-station-price"><strong>₹{station.price}</strong><small>/kWh</small></div><button aria-label={`View ${station.name} on map`} onClick={() => { setDestinationId(station.id); setPage("Map"); }}>↗</button></div>
                ))}
                <button className="primary-button full" onClick={() => setPage("Map")}>Explore charging map ↗</button>
              </article>
            </div>
            <p className="smart-disclaimer">Smart Mode uses the battery percentage and vehicle details you enter. It does not read a real vehicle battery, guarantee charger availability, or calculate road routes unless those integrations are added.</p>
          </section>
        )}

        {page === "Map" && (
          <section className="page">
            <ChargingMap />
          </section>
        )}

        {page === "Tracking" && (
          <section className="page tracking-page">
            <p className="eyebrow">LIVE JOURNEY · BATTERY ESTIMATES</p>
            <h1>EV Tracking & Battery Monitor</h1>
            <p>Locate your vehicle, estimate your remaining range, and navigate to a charging station.</p>

            <div className="tracking-grid">
              <article className="tracking-card tracking-battery-card">
                <div className="tracking-card-heading"><span>🔋</span><span className={`charging-pill ${chargingStatus === "charging" ? "is-charging" : ""}`}>{chargingStatus === "charging" ? "⚡ Charging" : "Not charging"}</span></div>
                <p className="tracking-label">Current battery level</p>
                <div className="battery-reading">{trackingBattery}<small>%</small></div>
                <div className="battery-track"><div className="battery-fill" style={{ width: `${trackingBattery}%` }} /></div>
                <label htmlFor="tracking-battery">Battery percentage (manual prototype control)</label>
                <input id="tracking-battery" type="range" min="0" max="100" value={trackingBattery} onChange={(e) => setTrackingBattery(Number(e.target.value))} />
                <div className="range-result"><span>Estimated range</span><strong>{estimatedRange.toFixed(0)} km</strong></div>
                <label htmlFor="full-range">Estimated range at 100% battery (km)</label>
                <input id="full-range" type="number" min="1" max="1000" value={fullRange} onChange={(e) => setFullRange(Math.min(1000, Math.max(1, Number(e.target.value) || 1)))} />
                <button className={`primary-button full ${chargingStatus === "charging" ? "charging-button" : ""}`} onClick={toggleCharging}>{chargingStatus === "charging" ? "Stop charging (demo)" : "Simulate plug in · Start charging"}</button>
                <small className="tracking-note">Charging status is simulated here; a website cannot detect a real cable without vehicle/charger integration.</small>
              </article>

              <article className="tracking-card">
                <div className="tracking-card-heading"><span>📍</span><span className="tracking-mini-tag">GPS location</span></div>
                <h2>Find a charging station</h2>
                <p className="tracking-muted">Use your device location to estimate straight-line distance to a demo station.</p>
                <button className="outline-button full" onClick={locateVehicle}>◎ Locate my vehicle</button>
                <p className="location-message" role="status">{locationMessage}</p>
                <label htmlFor="tracking-destination">Destination station</label>
                <select id="tracking-destination" value={destinationId} onChange={(e) => setDestinationId(Number(e.target.value))}>
                  {stations.map((station) => <option key={station.id} value={station.id}>{station.name} · {station.location}</option>)}
                </select>
                <div className="distance-metrics">
                  <div><span>Distance to station</span><strong>{distanceToStation == null ? "—" : `${distanceToStation.toFixed(1)} km`}</strong></div>
                  <div><span>Range after trip*</span><strong className={rangeAfterTrip != null && rangeAfterTrip < 0 ? "range-warning" : ""}>{rangeAfterTrip == null ? "—" : `${rangeAfterTrip.toFixed(1)} km`}</strong></div>
                </div>
                {rangeAfterTrip != null && <p className={`range-alert ${rangeAfterTrip < 0 ? "danger" : "safe"}`}>{rangeAfterTrip < 0 ? "⚠️ Estimated range may be insufficient. Find a closer charger." : "✓ Estimated battery range covers the straight-line distance; real roads may require more energy."}</p>}
                <button className="primary-button full" onClick={openStationRoute}>Open route in Google Maps ↗</button>
                <small className="tracking-note">*Distance here is straight-line, not road distance. The route opens in Google Maps for road navigation. Demo stations and coordinates are illustrative.</small>
              </article>
            </div>
          </section>
        )}

        {page === "Notifications" && (
          <section className="page">
            <p className="eyebrow">EV NAVIGATOR · REMINDER CENTRE</p>
            <h1>Smart Notifications 🔔</h1>
            <p>Manage low-battery alerts and reminders for demo bookings. Browser alerts require your permission and this app to be open for its checks to run.</p>

            <div className="profile-vehicle-grid" style={{ marginTop: 24 }}>
              <article className="form-card profile-card">
                <div className="profile-card-heading"><span className="profile-avatar">⚙</span><div><h2>Notification preferences</h2><p>Choose which reminders EV Navigator can show.</p></div></div>
                {[{ key: "lowBattery", title: "Low estimated battery", description: "Alert when the manually entered battery level reaches 20% or lower." }, { key: "bookingReminders", title: "Upcoming booking reminders", description: "Show a reminder for a demo booking scheduled within the next 24 hours." }, { key: "chargingReminders", title: "Charging-session reminders", description: "Keep this preference ready for future charging-session integration; no real charger session is detected yet." }].map((setting) => (
                  <label key={setting.key} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 0", borderBottom: "1px solid rgba(57,255,20,.14)", cursor: "pointer" }}>
                    <input type="checkbox" checked={Boolean(notificationSettings[setting.key])} onChange={(event) => updateNotificationSetting(setting.key, event.target.checked)} style={{ width: 18, height: 18, marginTop: 3, accentColor: "#39ff14" }} />
                    <span><strong style={{ display: "block" }}>{setting.title}</strong><small>{setting.description}</small></span>
                  </label>
                ))}
                <button className="primary-button full" type="button" onClick={enableBrowserNotifications} style={{ marginTop: 16 }}>Enable browser notifications ↗</button>
                {notificationStatus && <p role="status" className="success-message">{notificationStatus}</p>}
                <small className="profile-field-note">Reminders are best-effort and run while the app is open. Browser and operating-system settings may block desktop alerts.</small>
              </article>

              <article className="form-card profile-card">
                <div className="profile-card-heading"><span className="profile-avatar">🔔</span><div><h2>Notification history</h2><p>{notificationItems.length} saved {notificationItems.length === 1 ? "reminder" : "reminders"} on this device.</p></div></div>
                {notificationItems.length === 0 ? (
                  <div className="profile-empty-garage"><div className="profile-empty-icon">🔔</div><h3>You're all caught up</h3><p>Low-battery and upcoming demo-booking reminders will appear here when triggered.</p></div>
                ) : (
                  <div style={{ display: "grid", gap: 10, maxHeight: 430, overflowY: "auto" }}>
                    {notificationItems.map((notice) => <article key={notice.id} className="smart-panel" style={{ borderColor: "rgba(57,255,20,.35)" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}><strong>{notice.title}</strong><small>{new Date(notice.createdAt).toLocaleString()}</small></div><p style={{ marginBottom: 0, marginTop: 8 }}>{notice.body}</p></article>)}
                  </div>
                )}
                <button className="outline-button full" type="button" onClick={clearNotifications} style={{ marginTop: 14 }}>Clear notification history</button>
              </article>
            </div>
            <p className="smart-disclaimer" style={{ marginTop: 18 }}>Prototype notice: reminders are generated from manually entered battery values and in-memory demo bookings. They are not push notifications from a charging operator, and they are not guaranteed to run when the browser is closed.</p>
          </section>
        )}

        {page === "Emergency Assistance" && (
          <section className="page">
            <p className="eyebrow">EV NAVIGATOR · SAFETY CENTRE</p>
            <h1>Emergency Assistance 🚨</h1>
            <p>Keep a trusted contact ready, share your location, and find nearby roadside help.</p>

            <div className="profile-vehicle-grid" style={{ marginTop: 24 }}>
              <form className="form-card profile-card" onSubmit={(event) => {
                event.preventDefault();
                localStorage.setItem("ev-emergency-name", emergencyContactName.trim());
                localStorage.setItem("ev-emergency-phone", emergencyContactPhone.trim());
                setEmergencySavedMessage("Emergency contact saved on this device.");
              }}>
                <div className="profile-card-heading"><span className="profile-avatar">☎</span><div><h2>Trusted emergency contact</h2><p>Save someone you can call if your vehicle breaks down.</p></div></div>
                <label htmlFor="emergency-contact-name">Contact name</label>
                <input id="emergency-contact-name" value={emergencyContactName} onChange={(event) => setEmergencyContactName(event.target.value)} placeholder="e.g. Family member" />
                <label htmlFor="emergency-contact-phone">Phone number</label>
                <input id="emergency-contact-phone" type="tel" value={emergencyContactPhone} onChange={(event) => setEmergencyContactPhone(event.target.value)} placeholder="Enter phone number with country code if needed" />
                <button className="primary-button full" type="submit">Save emergency contact</button>
                {emergencySavedMessage && <p role="status" className="success-message">{emergencySavedMessage}</p>}
                {emergencyContactPhone.trim() && <a className="outline-button" href={`tel:${emergencyContactPhone.replace(/[^+\d]/g, "")}`} style={{ display: "inline-flex", marginTop: 10, textDecoration: "none" }}>Call {emergencyContactName.trim() || "trusted contact"} ↗</a>}
              </form>

              <article className="form-card profile-card">
                <div className="profile-card-heading"><span className="profile-avatar">⌖</span><div><h2>Share your location</h2><p>Allow location access to create a link you can send to your trusted contact.</p></div></div>
                <button className="primary-button full" type="button" onClick={() => {
                  if (!navigator.geolocation) { setEmergencyLocationMessage("This browser does not support location sharing."); return; }
                  setEmergencyLocationMessage("Getting your location…");
                  navigator.geolocation.getCurrentPosition(async (position) => {
                    const { latitude, longitude } = position.coords;
                    const coords = { latitude, longitude };
                    setEmergencyCoordinates(coords);
                    const mapUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
                    setEmergencyLocationMessage(`Location ready: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
                    try {
                      if (navigator.share) await navigator.share({ title: "My current location", text: "I may need help. This is my current location:", url: mapUrl });
                      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(mapUrl); setEmergencyLocationMessage("Location link copied to clipboard. Send it to your trusted contact."); }
                    } catch { /* User may dismiss the share dialog; location is still available below. */ }
                  }, (error) => setEmergencyLocationMessage(error.code === 1 ? "Location permission was denied. Allow location access in your browser and try again." : "Could not get your location. Check GPS and try again."), { enableHighAccuracy: true, timeout: 12000 });
                }}>Share my current location</button>
                <p role="status" style={{ marginTop: 14 }}>{emergencyLocationMessage}</p>
                {emergencyCoordinates && <a className="outline-button" href={`https://maps.google.com/?q=${emergencyCoordinates.latitude},${emergencyCoordinates.longitude}`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", textDecoration: "none" }}>Open my location on map ↗</a>}
                <hr style={{ margin: "22px 0", opacity: 0.2 }} />
                <h2>Find nearby repair services</h2>
                <p>Open a map search for nearby EV repair and roadside assistance providers.</p>
                <a className="primary-button" href="https://www.google.com/maps/search/EV+repair+and+roadside+assistance+near+me/" target="_blank" rel="noreferrer" style={{ display: "inline-flex", textDecoration: "none" }}>Find nearby help ↗</a>
              </article>
            </div>

            <article className="form-card profile-card" style={{ marginTop: 20, borderColor: "#39ff14" }}>
              <h2>⚠️ Critical low-battery guidance</h2>
              <ul style={{ lineHeight: 1.9, paddingLeft: 22 }}>
                <li>Move to a safe place off the road if you can do so safely, and turn on hazard lights when appropriate.</li>
                <li>Use your vehicle's official roadside assistance or call local emergency services if anyone is in immediate danger.</li>
                <li>Do not rely on sample station listings as confirmation that a charger is working or available.</li>
                <li>Keep your phone battery available for calls and location sharing.</li>
              </ul>
              <p className="smart-disclaimer">Prototype notice: this page does not automatically contact emergency services. Location sharing requires your permission, and repair results depend on the external map service.</p>
            </article>
          </section>
        )}

        {page === "Favourite Stations" && (() => {
          const favoriteDetails = favoriteStations
            .map((favorite) => ({ ...favorite, station: stations.find((station) => Number(station.id) === Number(favorite.id)) }))
            .filter((favorite) => favorite.station);
          const recentlyViewed = recentStations
            .map((visit) => ({ ...visit, station: stations.find((station) => Number(station.id) === Number(visit.id)) }))
            .filter((visit) => visit.station);
          return (
            <section className="page">
              <p className="eyebrow">EV NAVIGATOR · YOUR SAVED NETWORK</p>
              <h1>Favourite Stations ⭐</h1>
              <p>Save stations you want to revisit, add your own notes, and compare their sample price and charging power.</p>
              {favoriteStatus && <p className="notice" role="status">{favoriteStatus}</p>}
              <div className="section-heading" style={{ marginTop: 24 }}>
                <div><p className="eyebrow">YOUR SHORTLIST</p><h2>Saved stations ({favoriteDetails.length})</h2></div>
                {favoriteDetails.length > 1 && <span className="badge">Cheapest: {favoriteDetails.slice().sort((a, b) => a.station.price - b.station.price)[0].station.name}</span>}
              </div>
              {favoriteDetails.length === 0 ? (
                <div className="empty"><h3>No favourite stations yet</h3><p>Go to Explore and press ☆ Favourite on a station card to save it here.</p><button className="primary-button" onClick={() => setPage("Explore")}>Explore stations ↗</button></div>
              ) : (
                <div className="station-grid">
                  {favoriteDetails.map(({ station, note }) => (
                    <article className="station-card" key={station.id}>
                      <div className="station-art"><span className="station-symbol">★</span><span className="power">{station.power}</span><span className="sample">SAVED · SAMPLE DATA</span></div>
                      <div className="station-info">
                        <h3>{station.name}</h3><p className="location">⌖ {station.location}</p>
                        <div className="tags"><span>{station.connector}</span><span>{station.power}</span></div>
                        <div className="station-bottom"><div><strong>₹{station.price}</strong><small>/kWh</small></div><button className="outline-button" onClick={() => { setSelected(station); setPrice(station.price); recordStationVisit(station); }}>Details ↗</button></div>
                        <label htmlFor={`favorite-note-${station.id}`} style={{ display: "block", marginTop: 14 }}>Personal note</label>
                        <textarea id={`favorite-note-${station.id}`} rows="2" value={note || ""} onChange={(event) => updateFavoriteNote(station.id, event.target.value)} placeholder="e.g. Convenient after work" style={{ width: "100%", resize: "vertical", boxSizing: "border-box" }} />
                        <button className="outline-button full" type="button" onClick={() => toggleFavoriteStation(station)} style={{ marginTop: 10 }}>Remove favourite</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <div className="section-heading" style={{ marginTop: 32 }}><div><p className="eyebrow">COMPARE YOUR SHORTLIST</p><h2>Price & power comparison</h2></div></div>
              {favoriteDetails.length === 0 ? <p className="empty">Save at least one station to compare prices and charging power.</p> : (
                <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
                  <thead><tr><th style={{ textAlign: "left", padding: 12 }}>Station</th><th style={{ textAlign: "left", padding: 12 }}>Price/kWh</th><th style={{ textAlign: "left", padding: 12 }}>Charging power</th><th style={{ textAlign: "left", padding: 12 }}>Connector</th></tr></thead>
                  <tbody>{favoriteDetails.slice().sort((a, b) => a.station.price - b.station.price).map(({ station }) => <tr key={station.id} style={{ borderTop: "1px solid rgba(57,255,20,.22)" }}><td style={{ padding: 12 }}>{station.name}</td><td style={{ padding: 12, color: "#39ff14" }}>₹{station.price}</td><td style={{ padding: 12 }}>{station.power}</td><td style={{ padding: 12 }}>{station.connector}</td></tr>)}</tbody>
                </table></div>
              )}
              <div className="section-heading" style={{ marginTop: 32 }}><div><p className="eyebrow">RECENT ACTIVITY</p><h2>Recently viewed stations</h2></div></div>
              {recentlyViewed.length === 0 ? <p className="empty">Station details you open will appear here on this device.</p> : <div className="booking-list">{recentlyViewed.map(({ station, visitedAt }) => <article className="booking-card" key={station.id}><div><h3>{station.name}</h3><p>{station.location}</p><small>Viewed {new Date(visitedAt).toLocaleString()} · ₹{station.price}/kWh · {station.power}</small></div><button className="outline-button" onClick={() => { setSelected(station); setPrice(station.price); recordStationVisit(station); }}>View again ↗</button></article>)}</div>}
              <p className="smart-disclaimer">Prototype notice: favourites, notes, and recent views are saved in this browser on this device. Station prices and power are illustrative sample data, not live verified tariffs or availability.</p>
            </section>
          );
        })()}

        {page === "Gamification" && (() => {
          const level = Math.floor(gamification.xp / 100) + 1;
          const xpIntoLevel = gamification.xp % 100;
          const challenges = [
            { id: "explore-stations", title: "Explore the charging network", description: "Visit Explore and review a station's details.", xp: 25, icon: "🔎" },
            { id: "save-favorite", title: "Build your charging shortlist", description: "Save at least one favourite station.", xp: 30, icon: "⭐", disabled: favoriteStations.length === 0 },
            { id: "plan-trip", title: "Plan a battery-aware trip", description: "Review your route distance and estimated range in Route Planner.", xp: 35, icon: "🗺️" },
            { id: "green-impact", title: "Check your green impact", description: "Review your estimated CO₂ savings in Carbon Savings.", xp: 25, icon: "🌱" },
            { id: "safety-ready", title: "Prepare for the unexpected", description: "Review your emergency contact and roadside help options.", xp: 25, icon: "🚨" },
            { id: "learn-connector", title: "Learn your connector", description: "Check the connector saved for your primary vehicle in My Profile.", xp: 30, icon: "🔌" },
          ];
          const badges = [
            { id: "first-step", title: "First Green Step", detail: "Complete your first challenge", icon: "🌱" },
            { id: "eco-explorer", title: "Eco Explorer", detail: "Save a favourite station or complete 3 challenges", icon: "🧭" },
            { id: "charging-planner", title: "Charging Planner", detail: "Plan a trip or create a demo booking", icon: "🗺️" },
            { id: "green-champion", title: "Green Champion", detail: "Earn 200 XP", icon: "🏆" },
          ];
          return (
            <section className="page">
              <p className="eyebrow">EV NAVIGATOR · YOUR GREEN JOURNEY</p>
              <h1>Gamification & Achievements 🏆</h1>
              <p>Complete learning and planning challenges to earn XP, level up, and unlock badges. These are app achievements—not monetary rewards.</p>
              <div className="smart-mode-grid" style={{ marginTop: 24 }}>
                <article className="smart-panel" style={{ borderColor: "#39ff14" }}>
                  <p className="smart-label">TOTAL EXPERIENCE</p>
                  <div className="smart-battery-number">{gamification.xp}<small> XP</small></div>
                  <p>Earn points by completing the challenges below.</p>
                </article>
                <article className="smart-panel">
                  <p className="smart-label">CURRENT LEVEL</p>
                  <div className="smart-battery-number">{level}</div>
                  <p>{100 - xpIntoLevel} XP to reach Level {level + 1}</p>
                  <div className="smart-progress"><span style={{ width: `${xpIntoLevel}%` }} /></div>
                </article>
                <article className="smart-panel">
                  <p className="smart-label">BADGES UNLOCKED</p>
                  <div className="smart-battery-number">{gamification.unlockedBadges.length}<small> / {badges.length}</small></div>
                  <p>Keep learning and planning to unlock more.</p>
                </article>
              </div>
              {gamificationMessage && <p className="notice" role="status" style={{ marginTop: 18 }}>{gamificationMessage}</p>}
              <div className="section-heading" style={{ marginTop: 30 }}><div><p className="eyebrow">DAILY-STYLE CHALLENGES</p><h2>Choose your next achievement</h2></div></div>
              <div className="station-grid" style={{ marginTop: 16 }}>
                {challenges.map((challenge) => {
                  const completed = gamification.completedChallenges.includes(challenge.id);
                  return <article className="station-card" key={challenge.id} style={{ borderColor: completed ? "#39ff14" : undefined }}>
                    <div className="station-art"><span className="station-symbol">{challenge.icon}</span><span className="sample">{completed ? "COMPLETED" : `+${challenge.xp} XP`}</span></div>
                    <div className="station-info"><h3>{challenge.title}</h3><p>{challenge.description}</p><button className={completed ? "outline-button full" : "primary-button full"} type="button" disabled={completed} onClick={() => completeGreenChallenge(challenge)} style={{ marginTop: 12 }}>{completed ? "✓ Completed" : "Mark challenge complete"}</button></div>
                  </article>;
                })}
              </div>
              <div className="section-heading" style={{ marginTop: 32 }}><div><p className="eyebrow">YOUR COLLECTION</p><h2>Achievement badges</h2></div></div>
              <div className="smart-mode-grid" style={{ marginTop: 16 }}>
                {badges.map((badge) => {
                  const unlocked = gamification.unlockedBadges.includes(badge.id);
                  return <article className="smart-panel" key={badge.id} style={{ opacity: unlocked ? 1 : 0.58, borderColor: unlocked ? "#39ff14" : undefined }}><div style={{ fontSize: 34 }}>{unlocked ? badge.icon : "🔒"}</div><h3 style={{ color: unlocked ? "#39ff14" : "inherit" }}>{badge.title}</h3><p>{badge.detail}</p><span className="badge">{unlocked ? "UNLOCKED" : "LOCKED"}</span></article>;
                })}
              </div>
              <p className="smart-disclaimer" style={{ marginTop: 22 }}>Prototype notice: XP and badges are stored in this browser on this device. Challenges are self-reported and do not verify real driving or charging activity. No real prizes or monetary rewards are provided.</p>
            </section>
          );
        })()}

        {page === "Carbon Savings" && (() => {
          const petrolLitres = carbonDistanceKm / Math.max(1, carbonPetrolMileage);
          const petrolCo2Kg = petrolLitres * 2.31;
          const evEnergyKwh = carbonDistanceKm * carbonEvConsumption;
          // Illustrative grid factor: 0.7 kg CO₂ per kWh. Change this to a verified local factor when available.
          const evCo2Kg = evEnergyKwh * 0.7;
          const avoidedKg = Math.max(0, petrolCo2Kg - evCo2Kg);
          const petrolCost = petrolLitres * carbonPetrolPrice;
          const evCostEstimate = evEnergyKwh * 12;
          const moneySaved = petrolCost - evCostEstimate;
          return (
            <section className="page">
              <p className="eyebrow">EV NAVIGATOR · PLANET IMPACT</p>
              <h1>Carbon Savings Tracker 🌱</h1>
              <p>Estimate the emissions and fuel-cost difference between driving an EV and a comparable petrol vehicle.</p>

              <div className="smart-mode-grid" style={{ marginTop: 24 }}>
                <article className="smart-panel">
                  <p className="smart-label">Estimated CO₂ avoided</p>
                  <div className="smart-battery-number">{(avoidedKg / 1000).toFixed(2)}<small> t</small></div>
                  <p>≈ {Math.round(avoidedKg).toLocaleString()} kg CO₂ over the distance entered</p>
                </article>
                <article className="smart-panel">
                  <p className="smart-label">Estimated EV energy used</p>
                  <div className="smart-battery-number">{Math.round(evEnergyKwh).toLocaleString()}<small> kWh</small></div>
                  <p>Based on your selected consumption rate.</p>
                </article>
                <article className="smart-panel">
                  <p className="smart-label">Estimated cost difference</p>
                  <div className="smart-battery-number" style={{ fontSize: 30 }}>₹{Math.round(moneySaved).toLocaleString()}</div>
                  <p>{moneySaved >= 0 ? "Potential saving compared with petrol" : "Estimated extra cost compared with petrol"}</p>
                </article>
              </div>

              <div className="profile-vehicle-grid" style={{ marginTop: 20 }}>
                <article className="form-card profile-card">
                  <div className="profile-card-heading"><span className="profile-avatar">📊</span><div><h2>Your driving details</h2><p>Change these values to update the estimates.</p></div></div>
                  <label htmlFor="carbon-distance">Distance driven (km)</label>
                  <input id="carbon-distance" type="number" min="0" max="10000000" value={carbonDistanceKm} onChange={(e) => { const value = Math.max(0, Number(e.target.value) || 0); setCarbonDistanceKm(value); localStorage.setItem("ev-carbon-distance-km", String(value)); }} />
                  <label htmlFor="carbon-mileage">Comparable petrol vehicle mileage (km/L)</label>
                  <input id="carbon-mileage" type="number" min="1" max="100" step="0.5" value={carbonPetrolMileage} onChange={(e) => setCarbonPetrolMileage(Math.max(1, Number(e.target.value) || 1))} />
                  <label htmlFor="carbon-petrol-price">Petrol price (₹/L)</label>
                  <input id="carbon-petrol-price" type="number" min="0" max="1000" value={carbonPetrolPrice} onChange={(e) => setCarbonPetrolPrice(Math.max(0, Number(e.target.value) || 0))} />
                  <label htmlFor="carbon-ev-consumption">EV consumption (kWh/km)</label>
                  <input id="carbon-ev-consumption" type="number" min="0.01" max="5" step="0.01" value={carbonEvConsumption} onChange={(e) => setCarbonEvConsumption(Math.max(0.01, Number(e.target.value) || 0.15))} />
                </article>

                <article className="form-card profile-card">
                  <div className="profile-card-heading"><span className="profile-avatar">🌍</span><div><h2>Your estimated impact</h2><p>Illustrative comparison for {Math.round(carbonDistanceKm).toLocaleString()} km.</p></div></div>
                  <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                    <div className="smart-panel"><strong>Petrol car emissions</strong><h2 style={{ marginBottom: 0 }}>{Math.round(petrolCo2Kg).toLocaleString()} kg CO₂</h2><small>Petrol combustion estimate: 2.31 kg CO₂ per litre.</small></div>
                    <div className="smart-panel"><strong>EV electricity emissions</strong><h2 style={{ marginBottom: 0 }}>{Math.round(evCo2Kg).toLocaleString()} kg CO₂</h2><small>Assumed grid factor: 0.7 kg CO₂/kWh.</small></div>
                    <div className="smart-panel"><strong>Estimated costs</strong><p style={{ marginBottom: 4 }}>Petrol: ₹{Math.round(petrolCost).toLocaleString()}</p><p style={{ marginBottom: 0 }}>EV charging: ₹{Math.round(evCostEstimate).toLocaleString()} (assumed ₹12/kWh)</p></div>
                  </div>
                </article>
              </div>
              <p className="smart-disclaimer" style={{ marginTop: 18 }}>Estimates only—not measured vehicle data. Assumptions: petrol combustion 2.31 kg CO₂/L, electricity 0.7 kg CO₂/kWh, and EV charging ₹12/kWh. Actual emissions vary by electricity mix, vehicle efficiency, driving conditions, and charging source. Cost comparison excludes maintenance and other ownership costs.</p>
            </section>
          );
        })()}

        {page === "Profile" && (
          <section className="page profile-page profile-page-premium">
            <div className="profile-hero-banner">
              <div className="profile-hero-copy">
                <p className="eyebrow">YOUR EV NAVIGATOR ACCOUNT</p>
                <h1>Make every journey yours.</h1>
                <p>Keep your personal details and every electric vehicle in one place. Add a two-wheeler, a four-wheeler, or both.</p>
                <div className="profile-hero-pills">
                  <span>✦ {vehicles.length} {vehicles.length === 1 ? "vehicle" : "vehicles"} in your garage</span>
                  <span>◉ {profileReady ? "Account loaded" : "Loading account…"}</span>
                </div>
              </div>
              <div className="profile-hero-art" aria-hidden="true"><span className="profile-hero-orbit profile-orbit-a" /><span className="profile-hero-orbit profile-orbit-b" /><span className="profile-hero-bolt">⚡</span><span className="profile-hero-caption">YOUR ELECTRIC LIFE</span></div>
            </div>

            <div className="profile-vehicle-grid profile-premium-grid">
              <form className="form-card profile-card profile-panel" onSubmit={saveProfile}>
                <div className="profile-card-heading"><span className="profile-avatar">◉</span><div><h2>Personal details</h2><p>How we can identify and contact you</p></div></div>
                <label htmlFor="profile-name">Full name</label>
                <input id="profile-name" type="text" autoComplete="name" value={profileName} onChange={(event) => { setProfileName(event.target.value); setProfileSaved(false); setProfileMessage(""); }} placeholder="e.g. Aishwarya M" />
                <label htmlFor="profile-email">Contact email</label>
                <input id="profile-email" type="email" autoComplete="email" value={profileEmail} onChange={(event) => { setProfileEmail(event.target.value); setProfileSaved(false); setProfileMessage(""); }} placeholder="you@example.com" />
                <small className="profile-field-note">This is your contact email. Changing it here does not change your sign-in email.</small>
                <label htmlFor="profile-phone">Mobile number</label>
                <input id="profile-phone" type="tel" autoComplete="tel" value={profilePhone} onChange={(event) => { setProfilePhone(event.target.value); setProfileSaved(false); setProfileMessage(""); }} placeholder="e.g. +91 98765 43210" />
                <div className="profile-account-note"><span className="profile-account-dot" /><span>Signed-in profile · saved to your account when you press Save</span></div>
                <button className="primary-button profile-save-button" type="submit" disabled={!profileReady || profileSaving}>{profileSaving ? "Saving your profile…" : "Save profile & vehicles ↗"}</button>
                {profileMessage && <p className={`profile-feedback ${profileSaved ? "is-success" : ""}`} role="status">{profileMessage}</p>}
              </form>

              <form className="form-card vehicle-card profile-panel" onSubmit={addVehicle}>
                <div className="profile-card-heading"><span className="profile-avatar">⚡</span><div><h2>{editingVehicleId ? "Edit vehicle" : "Add a vehicle"}</h2><p>{editingVehicleId ? "Update your saved vehicle details" : "Build your personal EV garage"}</p></div></div>
                <div className="vehicle-type-picker" role="group" aria-label="Vehicle type">
                  <button type="button" className={`vehicle-type-option ${vehicleDraft.category === "2w" ? "selected" : ""}`} onClick={() => updateVehicleDraft("category", "2w")} aria-pressed={vehicleDraft.category === "2w"}><span className="vehicle-type-icon">🛵</span><span><strong>Two-wheeler</strong><small>Electric scooter or bike</small></span><span className="vehicle-type-check">{vehicleDraft.category === "2w" ? "✓" : "+"}</span></button>
                  <button type="button" className={`vehicle-type-option ${vehicleDraft.category === "4w" ? "selected" : ""}`} onClick={() => updateVehicleDraft("category", "4w")} aria-pressed={vehicleDraft.category === "4w"}><span className="vehicle-type-icon">🚙</span><span><strong>Four-wheeler</strong><small>Electric car or van</small></span><span className="vehicle-type-check">{vehicleDraft.category === "4w" ? "✓" : "+"}</span></button>
                </div>
                <label htmlFor="vehicle-model">Vehicle model / name <span className="profile-required">Required</span></label>
                <input id="vehicle-model" type="text" value={vehicleDraft.model} onChange={(event) => updateVehicleDraft("model", event.target.value)} placeholder={vehicleDraft.category === "2w" ? "e.g. Ather 450X, TVS iQube" : "e.g. Tata Nexon EV, MG ZS EV"} required />
                <label htmlFor="vehicle-custom-name">Custom name (optional)</label>
                <input id="vehicle-custom-name" type="text" value={vehicleDraft.customName} onChange={(event) => updateVehicleDraft("customName", event.target.value)} placeholder="e.g. My Blue Scooter" />
                <label htmlFor="vehicle-photo-url">Vehicle photo URL (optional)</label>
                <input id="vehicle-photo-url" type="url" value={vehicleDraft.photoUrl} onChange={(event) => updateVehicleDraft("photoUrl", event.target.value)} placeholder="https://example.com/my-ev.jpg" />
                <small className="profile-field-note">Use a direct image URL. Leave blank to use the default vehicle icon.</small>
                <div className="profile-form-two-col">
                  <div><label htmlFor="vehicle-registration">Registration (optional)</label><input id="vehicle-registration" type="text" value={vehicleDraft.registration} onChange={(event) => updateVehicleDraft("registration", event.target.value.toUpperCase())} placeholder="KA 01 AB 1234" /></div>
                  <div><label htmlFor="vehicle-battery">Battery capacity (kWh)</label><input id="vehicle-battery" type="number" min="0.1" max="300" step="0.1" value={vehicleDraft.batteryCapacity} onChange={(event) => updateVehicleDraft("batteryCapacity", event.target.value)} placeholder={vehicleDraft.category === "2w" ? "e.g. 3.7" : "e.g. 40"} /></div>
                </div>
                <div className="profile-form-two-col">
                  <div><label htmlFor="vehicle-connector">Charging connector</label><select id="vehicle-connector" value={vehicleDraft.connector} onChange={(event) => updateVehicleDraft("connector", event.target.value)}><option>Type 2</option><option>CCS2</option><option>Bharat AC-001</option><option>Proprietary</option><option>Other / not sure</option></select></div>
                  <div><label htmlFor="vehicle-range">Estimated range (km)</label><input id="vehicle-range" type="number" min="1" max="2000" value={vehicleDraft.rangeKm} onChange={(event) => updateVehicleDraft("rangeKm", event.target.value)} placeholder="e.g. 120" /></div>
                </div>
                <p className="eyebrow">BATTERY & CHARGING PREFERENCES</p>
                <div className="profile-form-two-col">
                  <div><label htmlFor="vehicle-charge-limit">Preferred charge limit</label><select id="vehicle-charge-limit" value={vehicleDraft.preferredChargeLimit} onChange={(event) => updateVehicleDraft("preferredChargeLimit", event.target.value)}><option value="70">70%</option><option value="80">80%</option><option value="90">90%</option><option value="100">100%</option></select></div>
                  <div><label htmlFor="vehicle-charge-speed">Preferred charging speed</label><select id="vehicle-charge-speed" value={vehicleDraft.preferredChargingSpeed} onChange={(event) => updateVehicleDraft("preferredChargingSpeed", event.target.value)}><option>Any speed</option><option>Slow / AC</option><option>Fast / DC</option></select></div>
                </div>
                <button className="profile-add-vehicle-button" type="submit">{editingVehicleId ? "✓ Update vehicle" : "＋ Add vehicle to garage"}</button>
                {editingVehicleId && <button className="outline-button full" type="button" onClick={cancelVehicleEdit}>Cancel editing</button>}
                <small className="profile-field-note">Add vehicles one by one. You can keep both two-wheelers and four-wheelers in the same profile.</small>
              </form>
            </div>

            <section className="profile-garage-section">
              <div className="profile-garage-heading"><div><p className="eyebrow">YOUR PERSONAL COLLECTION</p><h2>My EV garage</h2><p>Choose a primary vehicle and keep the rest of your vehicles saved here.</p></div><span className="profile-garage-count">{vehicles.length.toString().padStart(2, "0")} <small>SAVED</small></span></div>
              {vehicles.length === 0 ? (
                <div className="profile-empty-garage"><div className="profile-empty-icon">⚡</div><h3>Your garage is ready for its first EV</h3><p>Add your electric scooter, bike, car, or more than one vehicle using the form above.</p></div>
              ) : (
                <div className="profile-garage-grid">
                  {vehicles.map((vehicle) => (
                    <article className={`profile-vehicle-card ${primaryVehicleId === vehicle.id ? "is-primary" : ""}`} key={vehicle.id}>
                      <div className="profile-vehicle-card-top">{vehicle.photoUrl ? <img className="profile-vehicle-art" src={vehicle.photoUrl} alt={`${vehicle.customName || vehicle.model} vehicle`} onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <span className="profile-vehicle-art">{vehicle.category === "2w" ? "🛵" : "🚙"}</span>}<span className="profile-vehicle-category">{vehicle.category === "2w" ? "TWO-WHEELER" : "FOUR-WHEELER"}</span><div className="profile-vehicle-actions"><button type="button" className="profile-vehicle-edit" aria-label={`Edit ${vehicle.model}`} title="Edit vehicle" onClick={() => editVehicle(vehicle)}>✎</button><button type="button" className="profile-vehicle-remove" aria-label={`Remove ${vehicle.model}`} title="Remove vehicle" onClick={() => removeVehicle(vehicle.id)}>×</button></div></div>
                      <h3>{vehicle.customName || vehicle.model}</h3>
                      {vehicle.customName && <p className="profile-vehicle-reg">{vehicle.model}</p>}
                      <p className="profile-vehicle-reg">{vehicle.registration || "Registration not added"}</p>
                      <div className="profile-vehicle-specs"><div><span>Battery</span><strong>{vehicle.batteryCapacity ? `${vehicle.batteryCapacity} kWh` : "Not set"}</strong></div><div><span>Range</span><strong>{vehicle.rangeKm ? `${vehicle.rangeKm} km` : "Not set"}</strong></div><div><span>Connector</span><strong>{vehicle.connector || "Not set"}</strong></div><div><span>Charge limit</span><strong>{vehicle.preferredChargeLimit || 80}%</strong></div><div><span>Charge speed</span><strong>{vehicle.preferredChargingSpeed || "Any speed"}</strong></div></div>
                      <button type="button" className={`profile-primary-toggle ${primaryVehicleId === vehicle.id ? "active" : ""}`} onClick={() => { setPrimaryVehicleId(vehicle.id); setProfileSaved(false); setProfileMessage("Primary vehicle changed. Press Save profile & vehicles to sync it."); }}>{primaryVehicleId === vehicle.id ? "✓ Primary vehicle" : "☆ Set as primary"}</button>
                    </article>
                  ))}
                </div>
              )}
              <div className="profile-save-reminder"><span>ⓘ</span>Remember to press <strong>Save profile & vehicles</strong> after adding or removing vehicles so the changes sync to your signed-in account.</div>
            </section>
          </section>
        )}

        {page === "Route Planner" && (
          <section className="page">
            <p className="eyebrow">PLAN BEFORE YOU PLUG IN</p>
            <h1>Smart Route Planner</h1>
            <p>Estimate your trip distance and battery use, then open the route in Google Maps.</p>

            <div className="calculator">
              <div className="form-card">
                <label htmlFor="route-start">Starting point</label>
                <input id="route-start" type="text" value={routeStart} onChange={(e) => setRouteStart(e.target.value)} placeholder="e.g. Bengaluru" />
                <label htmlFor="route-end">Destination</label>
                <input id="route-end" type="text" value={routeEnd} onChange={(e) => setRouteEnd(e.target.value)} placeholder="e.g. Mysuru" />
                <label htmlFor="route-distance">Estimated trip distance (km)</label>
                <input id="route-distance" type="number" min="1" max="5000" value={routeDistance} onChange={(e) => setRouteDistance(Math.max(1, Math.min(5000, Number(e.target.value) || 1)))} />
                <label htmlFor="route-battery">Current battery: {routeBattery}%</label>
                <input id="route-battery" type="range" min="0" max="100" value={routeBattery} onChange={(e) => setRouteBattery(Number(e.target.value))} />
                <label htmlFor="route-full-range">Vehicle range at 100% battery (km)</label>
                <input id="route-full-range" type="number" min="1" max="1500" value={routeFullRange} onChange={(e) => setRouteFullRange(Math.max(1, Math.min(1500, Number(e.target.value) || 1)))} />
                <label htmlFor="route-consumption">Estimated energy use (kWh/km)</label>
                <input id="route-consumption" type="number" min="0.01" max="2" step="0.01" value={routeConsumption} onChange={(e) => setRouteConsumption(Math.max(0.01, Math.min(2, Number(e.target.value) || 0.01)))} />
                <p>Use your vehicle's real-world range and consumption figures for a more useful estimate.</p>
                <button className="primary-button full" onClick={() => { const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(routeStart)}&destination=${encodeURIComponent(routeEnd)}&travelmode=driving`; window.open(url, "_blank", "noopener,noreferrer"); }}>Open route in Google Maps ↗</button>
              </div>
              <div className="cost-card">
                <p>TRIP RANGE CHECK</p>
                <h2>{(routeFullRange * routeBattery / 100).toFixed(0)} <small>km available</small></h2>
                <p>Estimated trip: {routeDistance} km</p>
                <p>Estimated battery use: {(routeDistance / routeFullRange * 100).toFixed(1)}%</p>
                <p>Estimated energy required: {(routeDistance * routeConsumption).toFixed(1)} kWh</p>
                <div className={`range-alert ${routeFullRange * routeBattery / 100 < routeDistance ? "danger" : "safe"}`}>
                  {routeFullRange * routeBattery / 100 < routeDistance
                    ? `⚠️ Your estimated range may not cover this trip. Consider charging before leaving or adding a stop.`
                    : `✓ Your entered range appears sufficient, but keep a safety buffer for traffic, weather, hills, and detours.`}
                </div>
                <small className="tracking-note">This is a planning estimate, not live vehicle telemetry or a verified road-distance calculation.</small>
              </div>
            </div>

            <div className="section-heading"><div><p className="eyebrow">POSSIBLE CHARGING STOPS</p><h2>Stations to consider</h2></div><span className="muted">Sample station data</span></div>
            <div className="station-grid">
              {[...stations].sort((a, b) => a.price - b.price).map((station) => (
                <article className="station-card" key={station.id}>
                  <div className="station-card-top"><span className="station-icon">⚡</span><span className="station-status">SAMPLE STOP</span></div>
                  <h3>{station.name}</h3><p>{station.location}</p>
                  <div className="station-details"><span>Power <strong>{station.power}</strong></span><span>Connector <strong>{station.connector}</strong></span></div>
                  <div className="station-price-row"><div><small>Sample rate</small><strong>₹{station.price.toFixed(2)}<small>/kWh</small></strong></div><div><small>Estimated 10 kWh</small><strong>₹{(station.price * 10).toFixed(2)}</strong></div></div>
                  <button className="primary-button full" onClick={() => { setDestinationId(station.id); setPage("Map"); }}>View on map ↗</button>
                </article>
              ))}
            </div>
            <p className="smart-disclaimer">Route planning is a prototype: the sample stations are not guaranteed to lie along your route, and station availability is not live. Google Maps provides the actual road directions. Verify connector compatibility and station status before travelling.</p>
          </section>
        )}

        {page === "Cost Compare" && (
          <section className="page">
            <p className="eyebrow">FIND THE BETTER VALUE</p>
            <h1>Charging Cost Comparison</h1>
            <p>Compare estimated charging costs at the sample stations in EV Navigator.</p>

            <div className="calculator">
              <div className="form-card">
                <label htmlFor="comparison-energy">Energy to charge: {comparisonEnergy} kWh</label>
                <input
                  id="comparison-energy"
                  type="range"
                  min="1"
                  max="100"
                  value={comparisonEnergy}
                  onChange={(event) => setComparisonEnergy(Number(event.target.value))}
                />
                <p>Move the slider to match the amount of energy you want to buy. The totals below update automatically.</p>
              </div>
              <div className="cost-card">
                <p>Lowest sample rate</p>
                <h2>₹{Math.min(...stations.map((station) => station.price)).toFixed(2)}<small>/kWh</small></h2>
                <p>{stations.find((station) => station.price === Math.min(...stations.map((item) => item.price)))?.name}</p>
                <p>Estimated session: ₹{(Math.min(...stations.map((station) => station.price)) * comparisonEnergy).toFixed(2)}</p>
              </div>
            </div>

            <div className="station-grid">
              {[...stations].sort((a, b) => a.price - b.price).map((station, index) => (
                <article className="station-card" key={station.id}>
                  <div className="station-card-top">
                    <span className="station-icon">⚡</span>
                    <span className="station-status">{index === 0 ? "LOWEST SAMPLE COST" : `OPTION ${index + 1}`}</span>
                  </div>
                  <h3>{station.name}</h3>
                  <p>{station.location}</p>
                  <div className="station-details">
                    <span>Power <strong>{station.power}</strong></span>
                    <span>Connector <strong>{station.connector}</strong></span>
                  </div>
                  <div className="station-price-row">
                    <div><small>Rate</small><strong>₹{station.price.toFixed(2)}<small>/kWh</small></strong></div>
                    <div><small>{comparisonEnergy} kWh estimate</small><strong>₹{(station.price * comparisonEnergy).toFixed(2)}</strong></div>
                  </div>
                  <button className="primary-button full" onClick={() => { setDestinationId(station.id); setPage("Map"); }}>View on map ↗</button>
                </article>
              ))}
            </div>
            <p className="smart-disclaimer">Important: these are sample station rates already included in this demo, not verified live prices. Actual tariffs, parking fees, taxes, connector compatibility, and availability may differ. Confirm details with the charging provider before travelling.</p>
          </section>
        )}

        {page === "Calculator" && (
          <section className="page">
            <p className="eyebrow">PLAN YOUR CHARGING BUDGET</p>
            <h1>Charging Cost Calculator</h1>
            <p>Estimate how much your next charge will cost.</p>

            <div className="calculator">
              <div className="form-card">
                <label>Battery capacity: {capacity} kWh</label>
                <input
                  type="range"
                  min="10"
                  max="150"
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                />

                <label>Current battery: {battery}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={battery}
                  onChange={(e) => {
                    setBattery(Number(e.target.value));
                    setTarget((old) => Math.max(old, Number(e.target.value)));
                  }}
                />

                <label>Target battery: {target}%</label>
                <input
                  type="range"
                  min={battery}
                  max="100"
                  value={target}
                  onChange={(e) => setTarget(Number(e.target.value))}
                />

                <label>Price per kWh (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))}
                />
              </div>

              <div className="cost-card">
                <p>Estimated charging cost</p>
                <h2>₹{cost.toFixed(2)}</h2>
                <p>Energy needed: {energy.toFixed(2)} kWh</p>
                <p>Battery increase: {target - battery}%</p>
                <small>Estimate only. Actual rates may differ.</small>
              </div>
            </div>
          </section>
        )}

        {page === "Bookings" && (
          <section className="page">
            <p className="eyebrow">YOUR CHARGING PLANS</p>
            <h1>Charging Slot Booking</h1>
            <p className="notice">Prototype only: this form saves a demo booking in this app session. It does not reserve a real charger with an operator.</p>

            {bookingStation && (
              <form className="profile-card" onSubmit={confirmDemoBooking} style={{ maxWidth: 720, marginBottom: 24 }}>
                <div className="profile-card-heading"><span className="profile-avatar">📅</span><div><h2>Choose your charging slot</h2><p>{bookingStation.name} · {bookingStation.location}</p></div></div>
                <div className="profile-form-grid">
                  <label>Booking date
                    <input type="date" required min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)} value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} />
                  </label>
                  <label>Start time
                    <input type="time" required value={bookingTime} onChange={(e) => setBookingTime(e.target.value)} />
                  </label>
                  <label>Connector
                    <select value={bookingConnector} onChange={(e) => setBookingConnector(e.target.value)}>
                      {[...new Set([bookingStation.connector, "CCS2", "Type 2", "CHAdeMO", "Bharat AC001", "Bharat DC001"].filter(Boolean))].map((connector) => <option key={connector} value={connector}>{connector}</option>)}
                    </select>
                  </label>
                  <label>Vehicle
                    <select value={bookingVehicleId} onChange={(e) => setBookingVehicleId(e.target.value)}>
                      <option value="">No vehicle selected</option>
                      {vehicles.map((vehicle) => <option key={vehicle.id} value={String(vehicle.id)}>{vehicle.customName || vehicle.model || "My EV"}{vehicle.category === "2w" ? " · 2-wheeler" : " · 4-wheeler"}</option>)}
                    </select>
                  </label>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
                  <button className="primary-button" type="submit">Confirm demo booking</button>
                  <button className="outline-button" type="button" onClick={() => { setBookingStation(null); setBookingMessage(""); }}>Cancel</button>
                </div>
              </form>
            )}
            {bookingMessage && <p className="notice" role="status">{bookingMessage}</p>}

            <div className="section-heading" style={{ marginTop: 24 }}><div><p className="eyebrow">BOOK A STATION</p><h2>Available sample stations</h2></div></div>
            <div className="station-grid">
              {stations.map((station) => (
                <article className="station-card" key={station.id}>
                  <div className="station-card-top"><span className="station-icon">⚡</span><span className="station-status">Prototype</span></div>
                  <h3>{station.name}</h3><p>{station.location}</p>
                  <div className="station-meta"><span>{station.power}</span><span>{station.connector}</span></div>
                  <p><strong>₹{station.price}/kWh</strong> <small>sample rate</small></p>
                  <button className="primary-button full" onClick={() => bookStation(station)}>Choose date & time ↗</button>
                </article>
              ))}
            </div>

            <div className="section-heading" style={{ marginTop: 32 }}><div><p className="eyebrow">SAVED PLANS</p><h2>Booking history ({bookings.length})</h2></div></div>
            {bookings.length === 0 ? (
              <div className="empty"><h3>No bookings yet</h3><p>Choose a sample station above to create your first demo booking.</p></div>
            ) : (
              <div className="booking-list">
                {bookings.map((booking) => (
                  <article className="booking-card" key={booking.id}>
                    <div>
                      <h3>{booking.name}</h3>
                      <p>{booking.location}</p>
                      <small>{booking.date} at {booking.time} · {booking.connector} · {booking.vehicleName}</small>
                      <p><small>{booking.status || "Demo booking"}</small></p>
                    </div>
                    <button className="cancel-button" onClick={() => setBookings((old) => old.filter((b) => b.id !== booking.id))}>Cancel</button>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        <footer className="footer">
          EV Navigator · Made for electric mobility
          <span>Prototype · Explore cards are sample data; Map uses OpenStreetMap data</span>
        </footer>
      </main>

      {selected && (
        <div className="modal-backdrop" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setSelected(null);
        }}>
          <div className="modal">
            <button className="close" onClick={() => setSelected(null)}>×</button>
            <p className="eyebrow">STATION DETAILS</p>
            <h2>{selected.name}</h2>
            <p className="location">{selected.location}</p>

            <div className="modal-details">
              <div><span>Charging power</span><strong>{selected.power}</strong></div>
              <div><span>Connector</span><strong>{selected.connector}</strong></div>
              <div><span>Price</span><strong>₹{selected.price}/kWh</strong></div>
            </div>

            <p className="notice">
              This is a sample listing. Live charger availability is not connected.
            </p>

            <button className="outline-button full" onClick={() => toggleFavoriteStation(selected)} style={{ marginBottom: 10 }}>
              {favoriteStations.some((item) => Number(item.id) === Number(selected.id)) ? "★ Remove from favourites" : "☆ Save to favourites"}
            </button>
            <button className="primary-button full" onClick={() => bookStation(selected)}>
              Create demo booking ↗
            </button>

            <button
              className="outline-button full"
              onClick={() => window.open(
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.location)}`,
                "_blank",
                "noopener,noreferrer"
              )}
            >
              Open Google Maps ↗
            </button>
          </div>
        </div>
      )}
    </div>
  );
}



/* ---------- EV Navigator real authentication using Supabase ---------- */
function AuthGate() {
  const [mode, setMode] = useState("login"); // login | signup | forgot | reset | verify-phone
  const [identifier, setIdentifier] = useState("");
  const [signupName, setSignupName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState(null);
  const [pendingPhone, setPendingPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");

  // Accept a full international number (for example +919876543210),
  // or a 10-digit Indian mobile number (converted to +91).
  function normalizePhone(value) {
    const trimmed = value.trim();
    const digits = trimmed.replace(/\D/g, "");
    if (trimmed.startsWith("+")) {
      return digits.length >= 10 && digits.length <= 15 ? `+${digits}` : null;
    }
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
    return null;
  }

  function resolveIdentifier(value) {
    const trimmed = value.trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return { type: "email", value: trimmed.toLowerCase() };
    }
    const phone = normalizePhone(trimmed);
    if (phone) return { type: "phone", value: phone };
    throw new Error("Enter a valid email address or mobile number. For India, a 10-digit mobile number is accepted.");
  }

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!alive) return;
      if (sessionError) setError(sessionError.message);
      setSession(data?.session ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === "PASSWORD_RECOVERY") setMode("reset");
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  async function submitLogin(event) {
  event.preventDefault();
  setError("");
  setNotice("");
  setBusy(true);

  try {
    const account = resolveIdentifier(identifier);

    const credentials =
      account.type === "email"
        ? { email: account.value, password }
        : { phone: account.value, password };

    const { error } =
      await supabase.auth.signInWithPassword(credentials);

    if (error) {
      console.error("Supabase login error:", error.message);
      alert("Login failed: " + error.message);
      throw error;
    }
  } catch (err) {
    setError(err.message || "Unable to sign in.");
  } finally {
    setBusy(false);
  }
}

  async function submitSignup(event) {
    event.preventDefault(); setError(""); setNotice("");
    if (!signupName.trim()) { setError("Enter your full name."); return; }
    if (password.length < 8) {
      setError("Use a password with at least 8 characters."); setBusy(false); return;
    }
    try {
      const account = resolveIdentifier(identifier);
      let result;
      if (account.type === "email") {
        result = await supabase.auth.signUp({
          email: account.value,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { profile_name: signupName.trim(), full_name: signupName.trim() }
          }
        });
      } else {
        result = await supabase.auth.signUp({
          phone: account.value,
          password,
          options: { data: { profile_name: signupName.trim(), full_name: signupName.trim() } }
        });
      }
      if (result.error) throw result.error;

      if (result.data?.session) {
        setSession(result.data.session);
        setNotice("Your account was created and you are signed in.");
      } else if (account.type === "email") {
        setNotice("Account created. Check your email inbox for the real verification link before signing in.");
      } else {
        setPendingPhone(account.value);
        setPhoneOtp("");
        setMode("verify-phone");
        setNotice(`Enter the SMS verification code sent to ${account.value}.`);
      }
    } catch (err) {
      setError(err.message || "Unable to create account.");
    } finally {
      setBusy(false);
    }
  }

  async function submitPhoneVerification(event) {
    event.preventDefault(); setError(""); setNotice(""); setBusy(true);
    try {
      if (!/^\d{6}$/.test(phoneOtp.trim())) {
        throw new Error("Enter the 6-digit code sent to your phone.");
      }
      const { data, error } = await supabase.auth.verifyOtp({
        phone: pendingPhone,
        token: phoneOtp.trim(),
        type: "sms"
      });
      if (error) throw error;
      setSession(data?.session ?? null);
      setNotice("Phone verified successfully.");
      setMode("login");
      setPassword("");
      setIdentifier(pendingPhone);
    } catch (err) {
      setError(err.message || "Unable to verify the phone number.");
    } finally {
      setBusy(false);
    }
  }

  async function submitForgot(event) {
    event.preventDefault(); setError(""); setNotice(""); setBusy(true);
    try {
      const account = resolveIdentifier(identifier);
      if (account.type !== "email") {
        throw new Error("Password-reset links are currently sent by email. Enter the email address linked to your account.");
      }
      const { error } = await supabase.auth.resetPasswordForEmail(account.value, {
        redirectTo: `${window.location.origin}/`
      });
      if (error) throw error;
      setNotice("If an account exists for this email, a real password-reset link has been sent. Check your inbox and spam folder.");
    } catch (err) {
      setError(err.message || "Unable to send password reset email.");
    } finally {
      setBusy(false);
    }
  }

  async function submitReset(event) {
    event.preventDefault(); setError(""); setNotice("");
    if (newPassword.length < 8) { setError("Use a password with at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setError("The passwords do not match."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNotice("Password updated successfully."); setMode("login"); setPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Unable to update password. Open the reset link from your email again.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true); setError("");
    const { error } = await supabase.auth.signOut();
    if (error) setError(error.message);
    setBusy(false);
  }

  if (session) {
    return <>
      <div className="ev-auth-sessionbar">
        <span><span className="ev-auth-secure-dot" /> Signed in as {session.user?.email || session.user?.phone || "your account"}</span>
        <button type="button" onClick={logout} disabled={busy}>{busy ? "Signing out…" : "Sign out ↗"}</button>
      </div>
      <MainApp />
    </>;
  }

  const heading = mode === "login" ? "Sign in to your journey" : mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your access" : mode === "reset" ? "Create a new password" : "Verify your phone";
  const subtitle = mode === "login"
    ? "Sign in using your registered email address or mobile number and password."
    : mode === "signup"
      ? "Create an account with either your email address or mobile number."
      : mode === "forgot"
        ? "We will send a real password-reset link to your registered email address."
        : mode === "reset"
          ? "Choose a strong password you haven't used before."
          : `Enter the SMS code sent to ${pendingPhone}.`;

  return (
    <main className="ev-auth-screen">
      <div className="ev-auth-glow ev-auth-glow-one" aria-hidden="true" />
      <div className="ev-auth-glow ev-auth-glow-two" aria-hidden="true" />
      <section className="ev-auth-card">
        <div className="ev-auth-brand"><div className="ev-auth-logo">⚡</div><div><strong>EV NAVIGATOR</strong><span>SMART CHARGING · SECURE ACCESS</span></div></div>
        <div className="ev-auth-lock">⌑</div>
        <p className="ev-auth-eyebrow">{mode === "login" ? "WELCOME BACK" : mode === "signup" ? "JOIN EV NAVIGATOR" : mode === "forgot" ? "ACCOUNT RECOVERY" : mode === "reset" ? "SECURITY UPDATE" : "PHONE VERIFICATION"}</p>
        <h1>{heading}</h1>
        <p className="ev-auth-subtitle">{subtitle}</p>

        {(mode === "login" || mode === "signup") && <form className="ev-auth-form" onSubmit={mode === "login" ? submitLogin : submitSignup}>
          {mode === "signup" && <>
            <label htmlFor="ev-auth-full-name">Full name</label>
            <input id="ev-auth-full-name" type="text" autoComplete="name" value={signupName} onChange={e => setSignupName(e.target.value)} placeholder="Enter your full name" required />
          </>}
          <label htmlFor="ev-auth-identifier">Email address or mobile number</label>
          <input id="ev-auth-identifier" type="text" inputMode="email" autoComplete="username" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="you@example.com or +91 98765 43210" required />
          <label htmlFor="ev-auth-password">Password</label>
          <div className="ev-auth-password-wrap"><input id="ev-auth-password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === "login" ? "Enter your password" : "At least 8 characters"} required minLength={mode === "login" ? 1 : 8} /><button type="button" onClick={() => setShowPassword(v => !v)}>{showPassword ? "Hide" : "Show"}</button></div>
          {mode === "login" && <div className="ev-auth-options"><span /> <button type="button" className="ev-auth-link" onClick={() => { setMode("forgot"); setError(""); setNotice(""); }}>Forgot password?</button></div>}
          <button className="ev-auth-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in securely ↗" : "Create account ↗"}</button>
          <button className="ev-auth-secondary" type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setNotice(""); }}>{mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}</button>
        </form>}

        {mode === "verify-phone" && <form className="ev-auth-form" onSubmit={submitPhoneVerification}>
          <label htmlFor="ev-auth-phone-otp">6-digit SMS verification code</label>
          <input id="ev-auth-phone-otp" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={phoneOtp} onChange={e => setPhoneOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Enter SMS code" required />
          <button className="ev-auth-submit" type="submit" disabled={busy}>{busy ? "Verifying…" : "Verify phone ↗"}</button>
          <button className="ev-auth-secondary" type="button" onClick={() => { setMode("signup"); setError(""); setNotice(""); }}>Back to sign up</button>
        </form>}

        {mode === "forgot" && <form className="ev-auth-form" onSubmit={submitForgot}>
          <label htmlFor="ev-auth-recovery">Registered email address</label><input id="ev-auth-recovery" type="email" autoComplete="email" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="you@example.com" required />
          <button className="ev-auth-submit" type="submit" disabled={busy}>{busy ? "Sending…" : "Send password-reset email ↗"}</button>
          <button className="ev-auth-secondary" type="button" onClick={() => { setMode("login"); setError(""); setNotice(""); }}>Back to sign in</button>
        </form>}

        {mode === "reset" && <form className="ev-auth-form" onSubmit={submitReset}>
          <label htmlFor="ev-auth-new-password">New password</label><input id="ev-auth-new-password" type="password" autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 8 characters" required minLength={8} />
          <label htmlFor="ev-auth-confirm-password">Confirm new password</label><input id="ev-auth-confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password" required />
          <button className="ev-auth-submit" type="submit" disabled={busy}>{busy ? "Updating…" : "Update password ↗"}</button>
        </form>}

        {error && <p className="ev-auth-message ev-auth-error" role="alert">{error}</p>}
        {notice && <p className="ev-auth-message" role="status">{notice}</p>}
        <div className="ev-auth-security"><span>◇</span><p><strong>Real authentication</strong><br />Email and phone sign-in use Supabase Auth. Phone sign-up requires phone authentication and an SMS provider to be configured in your Supabase project.</p></div>
        <p className="ev-auth-footer">EV NAVIGATOR <span>•</span> SECURE ACCESS</p>
      </section>
    </main>
  );
}

export default function App() { return <AuthGate />; }
