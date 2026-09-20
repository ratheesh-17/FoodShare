import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      // Nav
      "Post Donation":   "Post Donation",
      "My Map":          "My Map",
      "History":         "History",
      "Leaderboard":     "Leaderboard",
      "Nearby Food":     "Nearby Food",
      "Claimed":         "Claimed",
      "Smart Engine":    "Smart Engine",
      "Route Planner":   "Route Planner",
      "Live Map":        "Live Map",
      "My Tasks":        "My Tasks",
      "Route Map":       "Route Map",
      "Overview":        "Overview",
      "Users":           "Users",
      "Donations":       "Donations",
      "Heatmap":         "Heatmap",
      "Sign Out":        "Sign Out",
      "Notifications":   "Notifications",

      // Login
      "Sign In":         "Sign In",
      "Create Account":  "Create Account",
      "Welcome back":    "Welcome back",
      "Join FoodShare":  "Join FoodShare",
      "Email Address":   "Email Address",
      "Password":        "Password",
      "Full Name":       "Full Name",
      "Address":         "Address",
      "Location":        "Location",
      "I am a":          "I am a",
      "Food Donor":      "Food Donor",
      "NGO":             "NGO",
      "Volunteer":       "Volunteer",
      "Share surplus food":  "Share surplus food",
      "Claim & distribute":  "Claim & distribute",
      "Pick up & deliver":   "Pick up & deliver",
      "Admin Login →":       "Admin Login →",

      // Donor
      "Donor Portal":    "Donor Portal",
      "Post a Donation": "Post a Donation",
      "Food Name":       "Food Name",
      "Food Type":       "Food Type",
      "Cooked":          "Cooked",
      "Raw":             "Raw",
      "Packaged":        "Packaged",
      "Event / Temple":  "Event / Temple",
      "Quantity (kg)":   "Quantity (kg)",
      "Serves (people)": "Serves (people)",
      "Pickup Address":  "Pickup Address",
      "Pickup Location": "Pickup Location",
      "Prepared At":     "Prepared At",
      "Expires At":      "Expires At",
      "Food Photo":      "Food Photo",
      "Post Donation →": "Post Donation →",
      "Use GPS":         "Use GPS",
      "Pick on Map":     "Pick on Map",
      "Hide Map":        "Hide Map",
      "Donation History":"Donation History",
      "Total Posted":    "Total Posted",
      "Completed":       "Completed",
      "Active Now":      "Active Now",
      "Meals Saved":     "Meals Saved",

      // Status
      "posted":    "Posted",
      "claimed":   "Claimed",
      "assigned":  "Assigned",
      "completed": "Completed",
      "expired":   "Expired",

      // NGO
      "Nearby Food 🏠":  "Nearby Food",
      "Claim":           "Claim",
      "Assign Volunteer":"Assign Volunteer",

      // Volunteer
      "Volunteer Portal":    "Volunteer Portal",
      "Mark as Delivered →": "Mark as Delivered →",
      "Total Tasks":         "Total Tasks",
      "Active":              "Active",
      "Assigned":            "Assigned",
      "Delivered":           "Delivered",

      // Common
      "Loading...":      "Loading...",
      "All caught up ✓": "All caught up ✓",
      "No donations found.": "No donations found.",
    },
  },

  ta: {
    translation: {
      // Nav
      "Post Donation":   "நன்கொடை இடுக",
      "My Map":          "என் வரைபடம்",
      "History":         "வரலாறு",
      "Leaderboard":     "தலைவர் பலகை",
      "Nearby Food":     "அருகில் உணவு",
      "Claimed":         "கோரப்பட்டது",
      "Smart Engine":    "ஸ்மார்ட் இயந்திரம்",
      "Route Planner":   "பாதை திட்டமிடல்",
      "Live Map":        "நேரடி வரைபடம்",
      "My Tasks":        "என் பணிகள்",
      "Route Map":       "பாதை வரைபடம்",
      "Overview":        "கண்ணோட்டம்",
      "Users":           "பயனர்கள்",
      "Donations":       "நன்கொடைகள்",
      "Heatmap":         "வெப்ப வரைபடம்",
      "Sign Out":        "வெளியேறு",
      "Notifications":   "அறிவிப்புகள்",

      // Login
      "Sign In":         "உள்நுழைக",
      "Create Account":  "கணக்கு உருவாக்கு",
      "Welcome back":    "மீண்டும் வரவேற்கிறோம்",
      "Join FoodShare":  "FoodShare-ல் சேரு",
      "Email Address":   "மின்னஞ்சல் முகவரி",
      "Password":        "கடவுச்சொல்",
      "Full Name":       "முழு பெயர்",
      "Address":         "முகவரி",
      "Location":        "இடம்",
      "I am a":          "நான் ஒரு",
      "Food Donor":      "உணவு நன்கொடையாளர்",
      "NGO":             "தன்னார்வ அமைப்பு",
      "Volunteer":       "தன்னார்வலர்",
      "Share surplus food":  "மிகுதி உணவை பகிர்",
      "Claim & distribute":  "கோரி விநியோகி",
      "Pick up & deliver":   "எடுத்து வழங்கு",
      "Admin Login →":       "நிர்வாகி உள்நுழைவு →",

      // Donor
      "Donor Portal":    "நன்கொடையாளர் பகுதி",
      "Post a Donation": "நன்கொடை இடுக",
      "Food Name":       "உணவின் பெயர்",
      "Food Type":       "உணவு வகை",
      "Cooked":          "சமைத்த உணவு",
      "Raw":             "பச்சை உணவு",
      "Packaged":        "பேக்கேஜ் செய்யப்பட்டது",
      "Event / Temple":  "நிகழ்வு / கோயில்",
      "Quantity (kg)":   "அளவு (கிலோ)",
      "Serves (people)": "பேருக்கு போதும்",
      "Pickup Address":  "எடுக்கும் இடம்",
      "Pickup Location": "எடுக்கும் இடம்",
      "Prepared At":     "தயாரித்த நேரம்",
      "Expires At":      "காலாவதி நேரம்",
      "Food Photo":      "உணவு புகைப்படம்",
      "Post Donation →": "நன்கொடை இடுக →",
      "Use GPS":         "GPS பயன்படுத்து",
      "Pick on Map":     "வரைபடத்தில் தேர்வு",
      "Hide Map":        "வரைபடம் மறை",
      "Donation History":"நன்கொடை வரலாறு",
      "Total Posted":    "மொத்தம் இட்டது",
      "Completed":       "முடிந்தது",
      "Active Now":      "இப்போது செயலில்",
      "Meals Saved":     "காப்பாற்றிய உணவுகள்",

      // Status
      "posted":    "இடப்பட்டது",
      "claimed":   "கோரப்பட்டது",
      "assigned":  "ஒதுக்கப்பட்டது",
      "completed": "முடிந்தது",
      "expired":   "காலாவதியானது",

      // NGO
      "Nearby Food 🏠":  "அருகில் உணவு",
      "Claim":           "கோரு",
      "Assign Volunteer":"தன்னார்வலரை நியமி",

      // Volunteer
      "Volunteer Portal":    "தன்னார்வலர் பகுதி",
      "Mark as Delivered →": "வழங்கியதாக குறி →",
      "Total Tasks":         "மொத்த பணிகள்",
      "Active":              "செயலில்",
      "Assigned":            "ஒதுக்கப்பட்டது",
      "Delivered":           "வழங்கப்பட்டது",

      // Common
      "Loading...":          "ஏற்றுகிறது...",
      "All caught up ✓":     "அனைத்தும் படிக்கப்பட்டது ✓",
      "No donations found.": "நன்கொடைகள் இல்லை.",
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });

export default i18n;
