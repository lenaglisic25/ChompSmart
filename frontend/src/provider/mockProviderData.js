export const mockPatient = {
  id: "p1",
  name: "Maria Gonzalez",
  conditions: ["Hypertension", "Type 2 Diabetes"],
  weightKg: 82,
  bmi: 31.2,
  lastSync: "2 hours ago",
  nextAppointment: "Mar 26, 2026",

  adherence: {
    daysLoggedPercent: 72,
    avgMealsPerDay: 2.6,
    loggingConsistency: 18,
    biometricsAdherence: 64,
  },

  progress: {
    goalCompletionPercent: 45,
    streakDays: 4,
    weightChangePercent: -2.1,
    sodiumDaysUnderLimit: 3,
  },

  alerts: [
    {
      id: "a1",
      severity: "high",
      title: "High sodium pattern",
      description: "Sodium exceeded target on 4 of last 7 days.",
      lastOccurrence: "Yesterday",
      action: "Review label reading and low-sodium swaps.",
    },
    {
      id: "a2",
      severity: "medium",
      title: "Added sugar elevated",
      description: "Added sugar above target on 3 days this week.",
      lastOccurrence: "2 days ago",
      action: "Discuss sugary drink replacements.",
    },
    {
      id: "a3",
      severity: "low",
      title: "Fiber below goal",
      description: "Fiber below target on 4 of last 7 days.",
      lastOccurrence: "Today",
      action: "Suggest beans, oats, vegetables, and fruit.",
    },
  ],

  engagement: {
    aiConversations30d: 12,
    avgQuestionsPerSession: 3.4,
    peakTimes: "6–8 PM",
    topTopics: ["Carb counting", "Label reading", "Budget swaps"],
    sentiment: "Mostly neutral",
    escalationFlags: ["Can't afford healthy food consistently"],
  },

  nutrients: {
    daily: {
      calories: 2200,
      protein: 98,
      carbs: 240,
      fat: 75,
      sodium: 1920,
      sugar: 28,
      fiber: 18,
    },
    weeklyAvg: {
      calories: 1970,
      protein: 92,
      carbs: 228,
      fat: 68,
      sodium: 1950,
      sugar: 30,
      fiber: 20,
    },
    monthlyAvg: {
      calories: 2050,
      protein: 94,
      carbs: 235,
      fat: 70,
      sodium: 1800,
      sugar: 27,
      fiber: 21,
    },
  },

  criticalNutrients: [
    { key: "sodium", label: "Sodium", value: 1920, unit: "mg", target: 1800, direction: "high" },
    { key: "sugar", label: "Added Sugar", value: 28, unit: "g", target: 25, direction: "high" },
    { key: "satFat", label: "Saturated Fat", value: 18, unit: "g", target: 15, direction: "high" },
    { key: "fat", label: "Total Fat", value: 75, unit: "g", target: 78, direction: "ok" },
    { key: "fiber", label: "Fiber", value: 18, unit: "g", target: 25, direction: "low" },
  ],

  mealAlerts: [
    "Lunch photo flagged with estimated sodium increase",
    "2 logged drinks likely high in added sugar",
  ],

  mealPhotos: [
    {
      id: "m1",
      url: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80",
      badge: "Est. Na ↑",
    },
    {
      id: "m2",
      url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80",
      badge: "Balanced",
    },
    {
      id: "m3",
      url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80",
      badge: "Est. Sugar ↑",
    },
    {
      id: "m4",
      url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
      badge: "High Protein",
    },
    {
      id: "m5",
      url: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=600&q=80",
      badge: "Low Fiber",
    },
  ],

  aiPatterns: [
    {
      id: "pat1",
      label: "Confusion about carbohydrate counting",
      evidence: "Detected in 3 chats over 2 weeks + 2 food log comments.",
      followUp: "Schedule a carb-count review.",
    },
    {
      id: "pat2",
      label: "Late-night snacking Tue–Thu",
      evidence: "4 late logs after 9 PM in the past 10 days.",
      followUp: "Discuss evening snack planning.",
    },
    {
      id: "pat3",
      label: "Weekends exceed sodium target",
      evidence: "Sodium target exceeded on both weekend days for 2 weeks.",
      followUp: "Plan lower-sodium restaurant choices.",
    },
    {
      id: "pat4",
      label: "Food access concern",
      evidence: "AI escalation + missed UF Food Pharmacy pickup.",
      followUp: "Connect to food access resources.",
    },
  ],

  engagedResources: {
    totalVideosViewed: 8,
    avgWatchTimeMin: 4,
    items: [
      "3 educational videos (e.g. Reading Nutrition Labels)",
      "2 recipe videos",
      "1 carb-counting tutorial",
      "2 saved video bookmarks",
    ],
  },

  followUpTopics: [
    "5-minute label-reading refresher (sodium, added sugar)",
    "Budget-friendly high-protein swaps using Food Pharmacy items",
    "Introduce plate method for T2D",
    "Batch-cooking low-sodium beans with no-salt bouillon",
  ],

  providerNotes:
    "Adherence improved from 62% to 78%. Sodium improved on 3 of last 7 days but remains above target overall. AI flagged ongoing confusion around carb counting. Plan to review plate method and label reading at next visit.",
};

export const mockPanelAnalytics = {
  riskCounts: {
    high: 3,
    moderate: 5,
    low: 2,
  },
  followUpQueue: 7,
  avgEngagementLogsPerWeek: 3.2,
  nutritionTrends: {
    sodium: "down slightly",
    fiber: "up slightly",
    sugar: "stable",
  },
  topBarriers: [
    { label: "Food access", percent: 30 },
    { label: "Sodium awareness", percent: 25 },
    { label: "Cost", percent: 20 },
    { label: "Transportation", percent: 15 },
  ],
  patientsNeedingFollowUp: [
    "No logs ≥ 3 days",
    "High sodium 4/7 days",
    "Food access issue",
    "Missed appointment",
    "AI escalation",
  ],
};