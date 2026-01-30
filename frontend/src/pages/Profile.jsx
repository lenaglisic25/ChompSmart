import React, { useMemo, useState } from "react";
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
  gender: ["Male", "Female", "Non-binary", "Prefer not to say"],

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

// helpers
function toggleInArray(arr, value) {
  return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
}

function Section({ title, children }) {
  return (
    <section className="psSection">
      <h2 className="psSectionTitle">{title}</h2>
      {children}
    </section>
  );
}

function TextField({ label, value, onChange, placeholder }) {
  return (
    <div className="psField">
      <label className="psLabel">{label}</label>
      <input
        className="psInput"
        value={value}
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
        value={value}
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
      <select className="psSelect" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value=""></option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function CheckboxGroup({ label, values, onToggle, options }) {
  return (
    <div className="psField">
      <div className="psLabel">{label}</div>
      <div className="psChecks">
        {options.map((o) => (
          <label key={o} className="psCheck">
            <input
              type="checkbox"
              checked={values.includes(o)}
              onChange={() => onToggle(o)}
            />
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
            <input
              type="radio"
              name={label}
              checked={value === o}
              onChange={() => onChange(o)}
            />
            <span>{o}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function ProfileSetup() {
  const [form, setForm] = useState({
    // Personal Basics
    name: "",
    birthday: "",
    homeAddress: "",
    height: "",
    weight: "",
    race: [],
    raceOtherText: "",
    ethnicity: "",
    gender: "",

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
  });

  const showRaceOther = form.race.includes("Other");
  const showHealthOther = form.healthConditions.includes("Other");
  const showFoodHelpOther = form.foodHelpPrograms.includes("Other");

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const dbPayload = useMemo(() => {
    // Send to backend / save to DB
    return {
      user_email: "test@clinic.com",
      name: form.name.trim(),
      birthday_text: form.birthday.trim(),
      home_address: form.homeAddress.trim(),
      height_text: form.height.trim(),
      weight_text: form.weight.trim(),
      race: form.race,
      race_other_text: showRaceOther ? form.raceOtherText.trim() : null,
      ethnicity: form.ethnicity || null,
      gender: form.gender || null,

      health_conditions: form.healthConditions,
      health_conditions_other_text: showHealthOther ? form.healthConditionsOtherText.trim() : null,
      medications_text: form.medications.trim(),
      med_allergies_text: form.medAllergies.trim(),

      steps_range: form.stepsRange || null,
      active_days_per_week: form.activeDays || null,
      movement_types: form.movementTypes,

      household_size: form.householdSize ? Number(form.householdSize) : null,
      household_age_groups: form.householdAgeGroups,

      dietary_restrictions: form.dietaryRestrictions,
      cuisine_styles: form.cuisineStyles,
      meal_types: form.mealTypes,

      cooking_skill: form.cookingSkill || null,
      cooking_methods: form.cookingMethods,
      kitchen_equipment: form.kitchenEquipment,

      weekly_grocery_budget: form.groceryBudget || null,
      food_help_programs: form.foodHelpPrograms,
      food_help_other_text: showFoodHelpOther ? form.foodHelpOtherText.trim() : null,
      grocery_stores: form.groceryStores,

      internet_access: form.internetAccess || null,
      technology_devices: form.technologyDevices,
    };
  }, [form, showRaceOther, showHealthOther, showFoodHelpOther]);

  function onSubmit(e) {
  e.preventDefault();

  const dbPayloadWithUser = {
    ...dbPayload,
    user_email: localStorage.getItem("currentUserEmail"), // link to the logged-in user
  };

  fetch("http://localhost:8000/profile/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dbPayloadWithUser),
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("Profile saved:", data);
      alert("Profile saved successfully!");
    })
    .catch((err) => {
      console.error(err);
      alert("Error saving profile");
    });
}


  return (
    <div className="psPage">
      <form className="psForm" onSubmit={onSubmit}>
        <h1 className="psTitle">ChompSmart User Profile Set-Up</h1>

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
            placeholder="Feet and inches (e.g., 5'7&quot;)"
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
              label="Race (Other) — please specify"
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
            label="Gender"
            value={form.gender}
            onChange={(v) => update("gender", v)}
            options={OPTIONS.gender}
          />
        </Section>

        <Section title="Health & Medicine">
          <CheckboxGroup
            label='Health problems: "Do you have any diseases or health conditions?" (select all that apply)'
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
            label='Medications: "What medicines do you take every day?"'
            value={form.medications}
            onChange={(v) => update("medications", v)}
            placeholder="List medication names (no dosage needed)"
          />

          <TextAreaField
            label='Allergies to medicine: "Do you have any medication allergies (e.g., penicillin)?"'
            value={form.medAllergies}
            onChange={(v) => update("medAllergies", v)}
            placeholder="List medication allergies"
          />
        </Section>

        <Section title="Physical Activity">
          <RadioGroup
            label='“How many steps do you walk in a typical day?”'
            value={form.stepsRange}
            onChange={(v) => update("stepsRange", v)}
            options={OPTIONS.steps}
          />

          <RadioGroup
            label="“How many days each week do you do at least 30 minutes of moderate to vigorous activity?”"
            value={form.activeDays}
            onChange={(v) => update("activeDays", v)}
            options={OPTIONS.activeDays}
          />

          <CheckboxGroup
            label="“What kinds of movement do you do most often?” (select all that apply)"
            values={form.movementTypes}
            onToggle={(o) => update("movementTypes", toggleInArray(form.movementTypes, o))}
            options={OPTIONS.movement}
          />
        </Section>

        <Section title="Family & Home">
          <SelectField
            label='Household size: “How many people live in your home?”'
            value={form.householdSize}
            onChange={(v) => update("householdSize", v)}
            options={OPTIONS.householdSizes}
          />

          <CheckboxGroup
            label='Age of members: “What are the ages of your family household?” (select all that apply)'
            values={form.householdAgeGroups}
            onToggle={(o) =>
              update("householdAgeGroups", toggleInArray(form.householdAgeGroups, o))
            }
            options={OPTIONS.householdAges}
          />
        </Section>

        <Section title="Food Palate">
          <CheckboxGroup
            label='Dietary restrictions: “What foods can’t you eat?” (select all that apply)'
            values={form.dietaryRestrictions}
            onToggle={(o) =>
              update("dietaryRestrictions", toggleInArray(form.dietaryRestrictions, o))
            }
            options={OPTIONS.dietaryRestrictions}
          />

          <CheckboxGroup
            label='Cuisine style: “Do you like a particular kind of cooking?” (select all that apply)'
            values={form.cuisineStyles}
            onToggle={(o) => update("cuisineStyles", toggleInArray(form.cuisineStyles, o))}
            options={OPTIONS.cuisineStyles}
          />

          <CheckboxGroup
            label='Meal type: “What meals do you want preferences for?” (select all that apply)'
            values={form.mealTypes}
            onToggle={(o) => update("mealTypes", toggleInArray(form.mealTypes, o))}
            options={OPTIONS.mealTypes}
          />
        </Section>

        <Section title="Cooking & Kitchen Details">
          <SelectField
            label='Cooking Skills: “What’s your baseline cooking knowledge?”'
            value={form.cookingSkill}
            onChange={(v) => update("cookingSkill", v)}
            options={OPTIONS.cookingSkill}
          />

          <CheckboxGroup
            label='Cooking Methods: “What way do you prefer to cook?” (select all that apply)'
            values={form.cookingMethods}
            onToggle={(o) => update("cookingMethods", toggleInArray(form.cookingMethods, o))}
            options={OPTIONS.cookingMethods}
          />

          <CheckboxGroup
            label='Kitchen Equipment Check-In: “What type of equipment do you have in your kitchen?” (select all that apply)'
            values={form.kitchenEquipment}
            onToggle={(o) =>
              update("kitchenEquipment", toggleInArray(form.kitchenEquipment, o))
            }
            options={OPTIONS.kitchenEquipment}
          />
        </Section>

        <Section title="Meal Budget Assessment">
          <RadioGroup
            label="“How much can you spend on groceries each week?”"
            value={form.groceryBudget}
            onChange={(v) => update("groceryBudget", v)}
            options={OPTIONS.groceryBudget}
          />

          <CheckboxGroup
            label="“Do you use food-help programs?” (select all that apply)"
            values={form.foodHelpPrograms}
            onToggle={(o) =>
              update("foodHelpPrograms", toggleInArray(form.foodHelpPrograms, o))
            }
            options={OPTIONS.foodHelp}
          />

          {showFoodHelpOther && (
            <TextField
              label="Food-help program (Other) — please specify"
              value={form.foodHelpOtherText}
              onChange={(v) => update("foodHelpOtherText", v)}
            />
          )}

          <CheckboxGroup
            label="“Where do you usually buy groceries?” (select all that apply)"
            values={form.groceryStores}
            onToggle={(o) => update("groceryStores", toggleInArray(form.groceryStores, o))}
            options={OPTIONS.groceryStores}
          />
        </Section>

        <Section title="Technology Skills">
          <RadioGroup
            label="“Do you have internet access?”"
            value={form.internetAccess}
            onChange={(v) => update("internetAccess", v)}
            options={OPTIONS.internetAccess}
          />

          <CheckboxGroup
            label="“What type of technology do you use?” (select all that apply)"
            values={form.technologyDevices}
            onToggle={(o) =>
              update("technologyDevices", toggleInArray(form.technologyDevices, o))
            }
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
