import re
from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional, Literal

# converting so the formula is correct
LB_TO_KG = 0.45359237
IN_TO_CM = 2.54

PalCategory = Literal["inactive", "low_active", "active", "very_active"]


@dataclass(frozen=True)
class TdeeResult:
    age_years: int
    height_cm: float
    weight_kg: float

    
    pal: float
    pal_category: PalCategory

    # setting up the Mifflin (BMR) and Mifflin-based TDEE (BMR * PAL)
    mifflin_bmr_male: float
    mifflin_bmr_female: float
    mifflin_tdee_male: float
    mifflin_tdee_female: float


    eer_male: float
    eer_female: float


def parse_dob_mmddyyyy(dob_text: str) -> date:
    return datetime.strptime(dob_text.strip(), "%m/%d/%Y").date()


def calc_age_years(dob: date, today: Optional[date] = None) -> int:
    today = today or date.today()
    years = today.year - dob.year
    if (today.month, today.day) < (dob.month, dob.day):
        years -= 1
    return years


def _normalize_ft_in(ft: int, inch: int) -> tuple[int, int]:
    if inch >= 12:
        ft += inch // 12
        inch = inch % 12
    return ft, inch


def parse_height_to_cm(height_text: str) -> float:
    #helping covert inputs
    """
    Accepts:
      5'7"
      5'7
      5 ft 7 in
      67 in
      6'12 (normalized)
    """
    s = height_text.strip().lower()
    s = s.replace("”", '"').replace("“", '"').replace("′", "'").replace("″", '"')
    s = re.sub(r"\s+", " ", s)

    m = re.match(r"^\s*(\d+)\s*'\s*(\d+)\s*(?:\"|in)?\s*$", s)
    if m:
        ft = int(m.group(1))
        inch = int(m.group(2))
        ft, inch = _normalize_ft_in(ft, inch)
        return (ft * 12 + inch) * IN_TO_CM

    m = re.match(r"^\s*(\d+)\s*(?:ft|feet)\s*(\d+)\s*(?:in|inch|inches)\s*$", s)
    if m:
        ft = int(m.group(1))
        inch = int(m.group(2))
        ft, inch = _normalize_ft_in(ft, inch)
        return (ft * 12 + inch) * IN_TO_CM

    m = re.match(r"^\s*(\d+)\s*(?:in|inch|inches)\s*$", s)
    if m:
        inch = int(m.group(1))
        return inch * IN_TO_CM

    raise ValueError(f"Unrecognized height format: {height_text}")


def parse_weight_to_kg(weight_text: str) -> float:
    """
    Accepts:
      150
      150 lb
      150 lbs
    """
    s = weight_text.strip().lower().replace(",", "")
    s = s.replace("lbs", "").replace("lb", "").strip()
    w_lb = float(s)
    return w_lb * LB_TO_KG


def pal_category_from_pal(pal: float) -> PalCategory:
    # inputting new ranges from the pal table
    # inactive: 1.0 ≤ PAL < 1.53
    # low_active: 1.53 ≤ PAL < 1.68
    # active: 1.68 ≤ PAL < 1.85
    # very_active: 1.85 ≤ PAL < 2.50
    if pal < 1.53:
        return "inactive"
    if pal < 1.68:
        return "low_active"
    if pal < 1.85:
        return "active"
    return "very_active"


def pal_from_labels(steps_range: Optional[str], active_days: Optional[str]) -> float:
    """
    Maps your UI buckets to typical PAL anchors:
      inactive ~ 1.40
      low_active ~ 1.60
      active ~ 1.75
      very_active ~ 2.05

    Then nudges up slightly based on workout days.
    """
    # defult
    base = 1.40

    if steps_range:
        s = steps_range.strip().lower()

        # this is with old or the new lables
        if s.startswith("inactive") or s.startswith("none"):
            base = 1.40
        elif s.startswith("low") or s.startswith("some"):
            base = 1.60
        elif s.startswith("active") or s.startswith("moderate"):
            base = 1.75
        elif s.startswith("very") or s.startswith("lots"):
            base = 2.05

    add = 0.0
    if active_days:
        a = active_days.strip().lower()
        if a.startswith("0"):
            add = 0.0
        elif a.startswith("1") or "1–2" in a or "1-2" in a:
            add = 0.05
        elif a.startswith("3") or "3–4" in a or "3-4" in a:
            add = 0.10
        elif a.startswith("5") or "5–7" in a or "5-7" in a:
            add = 0.20

    pal = base + add
    return max(1.0, min(2.49, pal))


def mifflin_bmr(weight_kg: float, height_cm: float, age_years: int, sex: str) -> float:
    base = 10.0 * weight_kg + 6.25 * height_cm - 5.0 * age_years
    if sex == "male":
        return base + 5.0
    if sex == "female":
        return base - 161.0
    raise ValueError("sex must be 'male' or 'female'")


def eer_adult_19_plus(weight_kg: float, height_cm: float, age_years: int, sex: str, pal_category: PalCategory) -> float:
    #new formulas
    """
    NAS adult (19+) EER equations (kcal/day)
    Age in years, weight in kg, height in cm.
    """
    if sex == "male":
        if pal_category == "inactive":
            return 753.07 - (10.83 * age_years) + (6.50 * height_cm) + (14.10 * weight_kg)
        if pal_category == "low_active":
            return 581.47 - (10.83 * age_years) + (8.30 * height_cm) + (14.94 * weight_kg)
        if pal_category == "active":
            return 1004.82 - (10.83 * age_years) + (6.52 * height_cm) + (15.91 * weight_kg)
        if pal_category == "very_active":
            return -517.88 - (10.83 * age_years) + (15.61 * height_cm) + (19.11 * weight_kg)

    if sex == "female":
        if pal_category == "inactive":
            return 584.90 - (7.01 * age_years) + (5.72 * height_cm) + (11.71 * weight_kg)
        if pal_category == "low_active":
            return 575.77 - (7.01 * age_years) + (6.60 * height_cm) + (12.14 * weight_kg)
        if pal_category == "active":
            return 710.25 - (7.01 * age_years) + (6.54 * height_cm) + (12.34 * weight_kg)
        if pal_category == "very_active":
            return 511.83 - (7.01 * age_years) + (9.07 * height_cm) + (12.56 * weight_kg)

    raise ValueError("sex must be 'male' or 'female'")


def compute_tdee(
    birthday_text: str,
    height_text: str,
    weight_text: str,
    steps_range: Optional[str],
    active_days_per_week: Optional[str],
) -> TdeeResult:
    dob = parse_dob_mmddyyyy(birthday_text)
    age = calc_age_years(dob)

    height_cm = parse_height_to_cm(height_text)
    weight_kg = parse_weight_to_kg(weight_text)

    pal = pal_from_labels(steps_range, active_days_per_week)
    pal_cat = pal_category_from_pal(pal)

    bmr_m = mifflin_bmr(weight_kg, height_cm, age, "male")
    bmr_f = mifflin_bmr(weight_kg, height_cm, age, "female")

    mifflin_tdee_m = bmr_m * pal
    mifflin_tdee_f = bmr_f * pal

    # this is for 19 and older,so that it works
    eer_m = eer_adult_19_plus(weight_kg, height_cm, age, "male", pal_cat)
    eer_f = eer_adult_19_plus(weight_kg, height_cm, age, "female", pal_cat)

    return TdeeResult(
        age_years=age,
        height_cm=height_cm,
        weight_kg=weight_kg,
        pal=pal,
        pal_category=pal_cat,
        mifflin_bmr_male=bmr_m,
        mifflin_bmr_female=bmr_f,
        mifflin_tdee_male=mifflin_tdee_m,
        mifflin_tdee_female=mifflin_tdee_f,
        eer_male=eer_m,
        eer_female=eer_f,
    )
