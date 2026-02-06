import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Profile.css";

const OPTIONS = {
  race: [
    "White",
    "Black or African American",
    "Asian",
    "American Indian or Alaska Native",
    "Native Hawaiian or Other Pacific Islander",
    "Mixed (two or more races)",
    "Other",
  ],
  ethnicity: ["Hispanic or Latino", "Not Hispanic or Latino", "Prefer not to say"],
sexAtBirth: ["Male", "Female"],


  healthConditions: [
    "Obesity",
    "Diabetes",
    "Hypertension",
    "Hyperlipidemia",
    "Coronary heart disease",
    "Other",
  ],

  steps: [
    "None (0–4,000 steps)",
    "Some (5,000–7,000 steps)",
    "Moderate (8,000–10,000 steps)",
    "Lots (10,000 or more steps)",
  ],

  activeDays: ["0 days", "1–2 days", "3–4 days", "5–7 days"],

  movement: [
    "Walking or light jogging",
    "Running or sprinting",
    "Dancing or aerobic classes",
    "Strength or weight training",
    "Yoga or stretching",
    "Sports (e.g., soccer, basketball)",
  ],

  householdSizes: Array.from({ length: 20 }, (_, i) => String(i + 1)),
  householdAges: ["Children", "Teenagers", "Adults", "Seniors"],

  dietaryRestrictions: [
    "Dairy-free",
    "Egg-free",
    "Gluten-free",
    "Keto",
    "Low-carb",
    "Low-fat",
    "Low-salt",
    "Low-sugar",
    "No seafood",
    "Nut-free",
    "Paleo",
    "Soy-free",
    "Vegan",
    "Vegetarian",
  ],

  cuisineStyles: [
    "American",
    "Asian (Chinese, Vietnamese, Korean, etc.)",
    "Caribbean (Jamaican, Puerto Rican, etc.)",
    "Cuban & Latin American",
    "Mediterranean (Greek, Italian, Turkish)",
    "Mexican & Tex-Mex",
    "Middle Eastern",
    "Native American",
    "Seafood",
    "Southern & barbecue",
  ],

  mealTypes: [
    "Breakfast",
    "Lunch",
    "Dinner",
    "Snacks",
    "Desserts",
    "Smoothies",
    "Soups",
    "Salads",
    "All of the above",
  ],

  cookingSkill: ["Beginner", "Competent", "Proficient"],

  cookingMethods: [
    "Baked",
    "Fried",
    "Grilled/Barbecue",
    "Instant-Pot",
    "Microwave",
    "Raw",
    "Slow-cooked",
    "Steamed",
    "Stir-fried",
  ],

  kitchenEquipment: [
    "Air-fryer",
    "Blender",
    "Cutting board",
    "Food processor",
    "Good set of knives",
    "Oven",
    "Pots and pans",
    "Pressure cooker or Instapot",
    "Microwave",
    "Toaster oven",
    "Refrigerator",
    "Rice cooker",
    "Slow cooker (crock-pot)",
    "Stand mixer",
    "Stove or range",
  ],

  groceryBudget: [
    "$50 or less",
    "$50-$100",
    "$101-150",
    "$151-200",
    "$201-250",
    "$251 or more",
  ],

  foodHelp: ["SNAP (Food stamps)", "Community food pantries", "Meals on Wheels", "Other"],

  groceryStores: [
    "Aldi",
    "Dollar-General",
    "Dollar Tree",
    "Publix",
    "Save-A-Lot",
    "Walmart",
    "Neighborhood food stores",
  ],

  internetAccess: ["Yes", "No"],

  technology: [
    "I have a cell phone",
    "I have a smart phone",
    "I have a computer or laptop",
    "I have a tablet",
  ],
};

// ---------- helpers ----------
function toggleInArray(arr, value) {
  const safe = Array.isArray(arr) ? arr : [];
  return safe.includes(value) ? safe.filter((x) => x !== value) : [...safe, value];
}

function Section({ title, children }) {
  return (
    <section className="psSection">
      <h2 className="psSectionTitle">{title}</h2>
      {children}
    </section>
  );
}

function TextField({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div className="psField">
      <label className="psLabel">{label}</label>
      <input
        className="psInput"
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || ""}
      />
    </div>
  );
}

function TextAreaField({ label, value, onChange, placeholder }) {
  return (
    <div className="psField">
      <label className="psLabel">{label}</label>
      <textarea
        className="psTextarea"
        rows={4}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || ""}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="psField">
      <label className="psLabel">{label}</label>
      <select className="psSelect" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value=""></option>
        {(options || []).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function CheckboxGroup({ label, values, onToggle, options }) {
  const safeValues = Array.isArray(values) ? values : [];
  return (
    <div className="psField">
      <div className="psLabel">{label}</div>
      <div className="psChecks">
        {options.map((o) => (
          <label key={o} className="psCheck">
            <input type="checkbox" checked={safeValues.includes(o)} onChange={() => onToggle(o)} />
            <span>{o}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function RadioGroup({ label, value, onChange, options }) {
  return (
    <div className="psField">
      <div className="psLabel">{label}</div>
      <div className="psRadios">
        {options.map((o) => (
          <label key={o} className="psRadio">
            <input type="radio" name={label} checked={(value ?? "") === o} onChange={() => onChange(o)} />
            <span>{o}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

const DEFAULT_FORM = {
  // Account
  email: "",
  password: "",

  // Personal Basics
  name: "",
  birthday: "",
  homeAddress: "",
  height: "",
  weight: "",
  race: [],
  raceOtherText: "",
  ethnicity: "",
sexAtBirth: "",

  // Health & Medicine
  healthConditions: [],
  healthConditionsOtherText: "",
  medications: "",
  medAllergies: "",

  // Physical Activity
  stepsRange: "",
  activeDays: "",
  movementTypes: [],

  // Family & Home
  householdSize: "",
  householdAgeGroups: [],

  // Food Palate
  dietaryRestrictions: [],
  cuisineStyles: [],
  mealTypes: [],

  // Cooking & Kitchen
  cookingSkill: "",
  cookingMethods: [],
  kitchenEquipment: [],

  // Budget
  groceryBudget: "",
  foodHelpPrograms: [],
  foodHelpOtherText: "",
  groceryStores: [],

  // Technology
  internetAccess: "",
  technologyDevices: [],
};

// Convert backend snake_case + nulls into UI-friendly values
function normalizeProfile(data) {
  if (!data) return null;

  return {
    email: data.email ?? "",
    password: data.password ? "••••••••" : "",

    name: data.name ?? "",
    birthday: data.birthday_text ?? "",
    homeAddress: data.home_address ?? "",
    height: data.height_text ?? "",
    weight: data.weight_text ?? "",

    race: data.race ?? [],
    raceOtherText: data.race_other_text ?? "",
    ethnicity: data.ethnicity ?? "",
   sexAtBirth: data.sex_at_birth ?? "",


    healthConditions: data.health_conditions ?? [],
    healthConditionsOtherText: data.health_conditions_other_text ?? "",
    medications: data.medications_text ?? "",
    medAllergies: data.med_allergies_text ?? "",

    stepsRange: data.steps_range ?? "",
    activeDays: data.active_days_per_week ?? "",
    movementTypes: data.movement_types ?? [],

    householdSize: data.household_size ? String(data.household_size) : "",
    householdAgeGroups: data.household_age_groups ?? [],

    dietaryRestrictions: data.dietary_restrictions ?? [],
    cuisineStyles: data.cuisine_styles ?? [],
    mealTypes: data.meal_types ?? [],

    cookingSkill: data.cooking_skill ?? "",
    cookingMethods: data.cooking_methods ?? [],
    kitchenEquipment: data.kitchen_equipment ?? [],

    groceryBudget: data.weekly_grocery_budget ?? "",
    foodHelpPrograms: data.food_help_programs ?? [],
    foodHelpOtherText: data.food_help_other_text ?? "",
    groceryStores: data.grocery_stores ?? [],

    internetAccess: data.internet_access ?? "",
    technologyDevices: data.technology_devices ?? [],
  };
}

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentUserEmail = localStorage.getItem("currentUserEmail") || "";

  const [form, setForm] = useState({ 
    ...DEFAULT_FORM, 
    email: location.pathname === "/setup-profile" ? "" : currentUserEmail 
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUserEmail || location.pathname === "/setup-profile") return;

    setLoading(true);
    fetch(`http://localhost:8000/profile/${currentUserEmail}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const normalized = normalizeProfile(data);
        if (normalized) {

          const { email: _email, password, ...rest } = normalized;
          setForm((prev) => ({ ...prev, ...rest, password }));
        }
      })
      .catch((err) => console.error("Profile fetch failed:", err))
      .finally(() => setLoading(false));
  }, [currentUserEmail, location.pathname]);

  const showRaceOther = Array.isArray(form.race) && form.race.includes("Other");
  const showHealthOther = Array.isArray(form.healthConditions) && form.healthConditions.includes("Other");
  const showFoodHelpOther = Array.isArray(form.foodHelpPrograms) && form.foodHelpPrograms.includes("Other");

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const dbPayload = useMemo(() => {
    const safeTrim = (v) => (v ?? "").trim();
    const isSetup = location.pathname === "/setup-profile";

    return {
      user_email: isSetup ? safeTrim(form.email) || null : currentUserEmail || null,
      email: safeTrim(form.email) || null,
      password: safeTrim(form.password) || null,

      name: safeTrim(form.name) || null,
      birthday_text: safeTrim(form.birthday) || null,
      home_address: safeTrim(form.homeAddress) || null,
      height_text: safeTrim(form.height) || null,
      weight_text: safeTrim(form.weight) || null,

      race: Array.isArray(form.race) && form.race.length > 0 ? form.race : null,
      race_other_text: showRaceOther ? safeTrim(form.raceOtherText) || null : null,
      ethnicity: form.ethnicity || null,
 sex_at_birth: form.sexAtBirth || null,


      health_conditions:
        Array.isArray(form.healthConditions) && form.healthConditions.length > 0 ? form.healthConditions : null,
      health_conditions_other_text: showHealthOther ? safeTrim(form.healthConditionsOtherText) || null : null,
      medications_text: safeTrim(form.medications) || null,
      med_allergies_text: safeTrim(form.medAllergies) || null,

      steps_range: form.stepsRange || null,
      active_days_per_week: form.activeDays || null,
      movement_types:
        Array.isArray(form.movementTypes) && form.movementTypes.length > 0 ? form.movementTypes : null,

      household_size: form.householdSize ? Number(form.householdSize) : null,
      household_age_groups:
        Array.isArray(form.householdAgeGroups) && form.householdAgeGroups.length > 0 ? form.householdAgeGroups : null,

      dietary_restrictions:
        Array.isArray(form.dietaryRestrictions) && form.dietaryRestrictions.length > 0 ? form.dietaryRestrictions : null,
      cuisine_styles: Array.isArray(form.cuisineStyles) && form.cuisineStyles.length > 0 ? form.cuisineStyles : null,
      meal_types: Array.isArray(form.mealTypes) && form.mealTypes.length > 0 ? form.mealTypes : null,

      cooking_skill: form.cookingSkill || null,
      cooking_methods: Array.isArray(form.cookingMethods) && form.cookingMethods.length > 0 ? form.cookingMethods : null,
      kitchen_equipment:
        Array.isArray(form.kitchenEquipment) && form.kitchenEquipment.length > 0 ? form.kitchenEquipment : null,

      weekly_grocery_budget: form.groceryBudget || null,
      food_help_programs:
        Array.isArray(form.foodHelpPrograms) && form.foodHelpPrograms.length > 0 ? form.foodHelpPrograms : null,
      food_help_other_text: showFoodHelpOther ? safeTrim(form.foodHelpOtherText) || null : null,
      grocery_stores: Array.isArray(form.groceryStores) && form.groceryStores.length > 0 ? form.groceryStores : null,

      internet_access: form.internetAccess || null,
      technology_devices:
        Array.isArray(form.technologyDevices) && form.technologyDevices.length > 0 ? form.technologyDevices : null,
    };
  }, [form, showRaceOther, showHealthOther, showFoodHelpOther, currentUserEmail, location.pathname]);

  async function onSubmit(e) {
    e.preventDefault();

    const isSetup = location.pathname === "/setup-profile";
    const userEmail = isSetup ? form.email : currentUserEmail;

    if (!userEmail) {
      alert("No email provided. Please enter an email.");
      return;
    }

    // Only require password on setup-profile
    if (isSetup && !form.password) {
      alert("Please enter a password.");
      return;
    }

    setLoading(true);
    try {
      // if on setup-profile, first create the user account
      if (isSetup) {
        const userResponse = await fetch("http://localhost:8000/users/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userEmail, password: form.password }),
        });

        if (!userResponse.ok) {
          const raw = await userResponse.text();
          console.error("Error creating user:", raw);
          alert(`Error creating account: ${raw}`);
          return;
        }
      }

      // Then save the profile
      const response = await fetch("http://localhost:8000/profile/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbPayload),
      });

      if (!response.ok) {
        const raw = await response.text();
        console.error("Error saving profile:", raw);
        alert(`Error saving profile: ${raw}`);
        return;
      }

      await response.json();
      alert("Profile saved successfully!");
      
      // if on setup-profile, log in the new user
      if (isSetup) {
        localStorage.setItem("currentUserEmail", userEmail);
      }
      
      navigate("/app/learn");
    } catch (err) {
      console.error("Network or server error:", err);
      alert("Error saving profile");
    } finally {
      setLoading(false);
    }
  }

  // changes for when we are in setup-profile (logged in)
  return (
    <div className="psPage">
      <form className="psForm" onSubmit={onSubmit}>
        <h1 className="psTitle">
          {location.pathname !== "/setup-profile" ? "User Profile" : "ChompSmart User Profile Set-Up"}
        </h1>

        {loading && <div style={{ marginBottom: 12, fontWeight: 600 }}>Loading profile...</div>}

        <Section title="Account">
          {location.pathname === "/setup-profile" ? (
            <>
              <TextField
                label="Email"
                value={form.email}
                onChange={(v) => update("email", v)}
                placeholder="you@clinic.com"
              />

              <TextField
                label="Password"
                type="password"
                value={form.password}
                onChange={(v) => update("password", v)}
                placeholder="Enter password"
              />
            </>
          ) : (
            <>
              <div className="psField">
                <label className="psLabel">Email</label>
                <div style={{ padding: "8px 12px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
                  {form.email}
                </div>
              </div>

              <div className="psField">
                <label className="psLabel">Password</label>
                <div style={{ padding: "8px 12px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
                  ••••••••
                </div>
              </div>
            </>
          )}
        </Section>

        <Section title="Personal Basics">
          <TextField label="Name" value={form.name} onChange={(v) => update("name", v)} />

          <TextField
            label="Birthday"
            value={form.birthday}
            onChange={(v) => update("birthday", v)}
            placeholder="MM/DD/YYYY"
          />

          <TextField
            label="Home Address"
            value={form.homeAddress}
            onChange={(v) => update("homeAddress", v)}
            placeholder="Street address, city, state, zip code"
          />

          <TextField
            label="Height"
            value={form.height}
            onChange={(v) => update("height", v)}
            placeholder={`Feet and inches (e.g., 5'7")`}
          />

          <TextField
            label="Weight"
            value={form.weight}
            onChange={(v) => update("weight", v)}
            placeholder="lbs (e.g., 150)"
          />

          <CheckboxGroup
            label="Race (select all that apply)"
            values={form.race}
            onToggle={(o) => update("race", toggleInArray(form.race, o))}
            options={OPTIONS.race}
          />

          {showRaceOther && (
            <TextField
              label="Race (Other) - please specify"
              value={form.raceOtherText}
              onChange={(v) => update("raceOtherText", v)}
            />
          )}

          <SelectField
            label="Ethnicity"
            value={form.ethnicity}
            onChange={(v) => update("ethnicity", v)}
            options={OPTIONS.ethnicity}
          />

          <SelectField
  label="Sex Assigned at Birth"
  value={form.sexAtBirth}
  onChange={(v) => update("sexAtBirth", v)}
  options={OPTIONS.sexAtBirth}
/>

        </Section>

        <Section title="Health & Medicine">
          <CheckboxGroup
            label="Health problems: Do you have any diseases or health conditions? (select all that apply)"
            values={form.healthConditions}
            onToggle={(o) => update("healthConditions", toggleInArray(form.healthConditions, o))}
            options={OPTIONS.healthConditions}
          />

          {showHealthOther && (
            <TextField
              label="Additional health conditions (Other)"
              value={form.healthConditionsOtherText}
              onChange={(v) => update("healthConditionsOtherText", v)}
              placeholder="Type additional conditions"
            />
          )}

          <TextAreaField
            label="Medications: What medicines do you take every day?"
            value={form.medications}
            onChange={(v) => update("medications", v)}
            placeholder="List medication names (no dosage needed)"
          />

          <TextAreaField
            label="Allergies to medicine: Do you have any medication allergies (e.g., penicillin)?"
            value={form.medAllergies}
            onChange={(v) => update("medAllergies", v)}
            placeholder="List medication allergies"
          />
        </Section>

        <Section title="Physical Activity">
          <RadioGroup
            label="How many steps do you walk in a typical day?"
            value={form.stepsRange}
            onChange={(v) => update("stepsRange", v)}
            options={OPTIONS.steps}
          />

          <RadioGroup
            label="How many days each week do you do at least 30 minutes of moderate to vigorous activity?"
            value={form.activeDays}
            onChange={(v) => update("activeDays", v)}
            options={OPTIONS.activeDays}
          />

          <CheckboxGroup
            label="What kinds of movement do you do most often? (select all that apply)"
            values={form.movementTypes}
            onToggle={(o) => update("movementTypes", toggleInArray(form.movementTypes, o))}
            options={OPTIONS.movement}
          />
        </Section>

        <Section title="Family & Home">
          <SelectField
            label="Household size: How many people live in your home?"
            value={form.householdSize}
            onChange={(v) => update("householdSize", v)}
            options={OPTIONS.householdSizes}
          />

          <CheckboxGroup
            label="Age groups in household: What are the ages of your household members? (select all that apply)"
            values={form.householdAgeGroups}
            onToggle={(o) => update("householdAgeGroups", toggleInArray(form.householdAgeGroups, o))}
            options={OPTIONS.householdAges}
          />
        </Section>

        <Section title="Food Palate">
          <CheckboxGroup
            label="Dietary restrictions: What foods cannot you eat? (select all that apply)"
            values={form.dietaryRestrictions}
            onToggle={(o) => update("dietaryRestrictions", toggleInArray(form.dietaryRestrictions, o))}
            options={OPTIONS.dietaryRestrictions}
          />

          <CheckboxGroup
            label="Cuisine style: What kinds of cooking do you like? (select all that apply)"
            values={form.cuisineStyles}
            onToggle={(o) => update("cuisineStyles", toggleInArray(form.cuisineStyles, o))}
            options={OPTIONS.cuisineStyles}
          />

          <CheckboxGroup
            label="Meal preferences: What meals do you want recommendations for? (select all that apply)"
            values={form.mealTypes}
            onToggle={(o) => update("mealTypes", toggleInArray(form.mealTypes, o))}
            options={OPTIONS.mealTypes}
          />
        </Section>

        <Section title="Cooking & Kitchen Details">
          <SelectField
            label="Cooking skills: What is your baseline cooking knowledge?"
            value={form.cookingSkill}
            onChange={(v) => update("cookingSkill", v)}
            options={OPTIONS.cookingSkill}
          />

          <CheckboxGroup
            label="Cooking methods: What ways do you prefer to cook? (select all that apply)"
            values={form.cookingMethods}
            onToggle={(o) => update("cookingMethods", toggleInArray(form.cookingMethods, o))}
            options={OPTIONS.cookingMethods}
          />

          <CheckboxGroup
            label="Kitchen equipment: What equipment do you have in your kitchen? (select all that apply)"
            values={form.kitchenEquipment}
            onToggle={(o) => update("kitchenEquipment", toggleInArray(form.kitchenEquipment, o))}
            options={OPTIONS.kitchenEquipment}
          />
        </Section>

        <Section title="Meal Budget Assessment">
          <RadioGroup
            label="How much can you spend on groceries each week?"
            value={form.groceryBudget}
            onChange={(v) => update("groceryBudget", v)}
            options={OPTIONS.groceryBudget}
          />

          <CheckboxGroup
            label="Do you use food-help programs? (select all that apply)"
            values={form.foodHelpPrograms}
            onToggle={(o) => update("foodHelpPrograms", toggleInArray(form.foodHelpPrograms, o))}
            options={OPTIONS.foodHelp}
          />

          {showFoodHelpOther && (
            <TextField
              label="Food-help program (Other) - please specify"
              value={form.foodHelpOtherText}
              onChange={(v) => update("foodHelpOtherText", v)}
            />
          )}

          <CheckboxGroup
            label="Where do you usually buy groceries? (select all that apply)"
            values={form.groceryStores}
            onToggle={(o) => update("groceryStores", toggleInArray(form.groceryStores, o))}
            options={OPTIONS.groceryStores}
          />
        </Section>

        <Section title="Technology Skills">
          <RadioGroup
            label="Do you have internet access?"
            value={form.internetAccess}
            onChange={(v) => update("internetAccess", v)}
            options={OPTIONS.internetAccess}
          />

          <CheckboxGroup
            label="What technology do you use? (select all that apply)"
            values={form.technologyDevices}
            onToggle={(o) => update("technologyDevices", toggleInArray(form.technologyDevices, o))}
            options={OPTIONS.technology}
          />
        </Section>

        <button className="psSaveBtn" type="submit">
          Save Profile
        </button>
      </form>
    </div>
  );
}
