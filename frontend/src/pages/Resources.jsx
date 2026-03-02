import React from "react";
import "./Resources.css";

const resources = [
  {
    title: "American Association of Clinical Endocrinology (AACE)",
    description:
      "A leading organization of experts in diabetes, thyroid disease, obesity, and other hormone-related conditions. They educate patients and improve care so people can better manage their health.",
    links: [
      { label: "Official Website", href: "https://www.aace.com/" },
      // stable channel ID link
      { label: "YouTube Channel", href: "https://www.youtube.com/channel/UCidGPNaJGvONmfYkg7bzImw" },
    ],
  },
  {
    title: "American Diabetes Association (ADA) – Healthy Eating",
    description:
      "Food and nutrition guidance to help you understand how foods affect blood sugar, with simple meal planning tips, shopping help, healthy swaps, and recipes.",
    links: [
      { label: "Food & Nutrition", href: "https://diabetes.org/healthy-living/recipes-nutrition" },
      // stable /user link
      { label: "YouTube Channel", href: "https://www.youtube.com/user/AmericanDiabetesAssn" },
    ],
  },
  {
    title: "American Heart Association (AHA) – Healthy Eating",
    description:
      "Heart-healthy eating guidance focused on simple habits like fruits/vegetables, whole grains, lean proteins, and reducing sodium and added sugars.",
    links: [
      { label: "Healthy Eating", href: "https://www.heart.org/en/healthy-living/healthy-eating" },
      // stable /c link
      { label: "YouTube Channel", href: "https://www.youtube.com/c/AmericanHeart" },
    ],
  },
  {
    title: "Foundation of the National Lipid Association",
    description:
      "Patient-friendly education about cholesterol and triglycerides and how to reduce heart attack and stroke risk through lifestyle changes.",
    links: [
      { label: "Learn About Cholesterol", href: "https://www.lipid.org/" },
      // Foundation’s official handle (works) OR use NLA channel below if you prefer
      { label: "YouTube Channel", href: "https://www.youtube.com/@FoundationoftheNLA" },
      // Optional: the National Lipid Association main channel (very stable)
      { label: "NLA YouTube Channel", href: "https://www.youtube.com/channel/UCK2D8VS3QmYX0Wm5YxEz9Wg" },
    ],
  },
  {
    title: "How to Health UF",
    description:
      "Educational video collection created by University of Florida DNP candidates with practical tips for healthier eating, shopping, and quick meal ideas.",
    links: [
      { label: "YouTube Search", href: "https://www.youtube.com/results?search_query=How+to+Health+UF" },
      { label: "UF Nursing", href: "https://nursing.ufl.edu/" },
    ],
  },
  {
    title: "UF IFAS Social",
    description:
      "A UF/IFAS channel sharing research, education, and Extension efforts, with practical tips and community-focused content.",
    links: [
      // UF/IFAS Social specific channel
      { label: "YouTube Channel", href: "https://www.youtube.com/c/UFIFASSocial" },
      { label: "Website", href: "https://ifas.ufl.edu/" },
    ],
  },
  {
    title: "Penn State Extension",
    description:
      "Simple, expert-led videos on nutrition basics and food safety: safe cooking, storage, kitchen hygiene, and meal planning.",
    links: [
      // stable /c link
      { label: "YouTube Channel", href: "https://www.youtube.com/c/PennStateExtension" },
      { label: "Website", href: "https://extension.psu.edu/" },
    ],
  },
  {
    title: "UW Health",
    description:
      "Nutrition videos from dietitians with clear explanations on meal planning and healthy eating patterns like the Mediterranean diet.",
    links: [
      // stable custom URL that resolves correctly
      { label: "YouTube Channel", href: "https://www.youtube.com/uwhealthwi" },
      { label: "Website", href: "https://www.uwhealth.org/" },
    ],
  },
  {
    title: "UF Health Jacksonville",
    description:
      "Health education videos, including nutrition-focused content such as sugar in drinks and general wellness topics.",
    links: [
      // stable channel ID link
      { label: "YouTube Channel", href: "https://www.youtube.com/channel/UC7nIc7-K3-OeFCcnP-ZRxOw" },
      { label: "Website", href: "https://ufhealthjax.org/" },
    ],
  },
];

export default function Resources() {
  return (
    <div className="resourcesPage">
      <header className="resourcesHeader">
        <h1>Resources</h1>
        <p>
          Welcome to your Resources page! Here you’ll find simple tips, trusted videos,
          and guides to help you eat well and cook healthy meals—no matter your budget
          or kitchen skills.
        </p>
      </header>

      <section className="resourcesIntroCard">
        <h2>Why healthy eating matters</h2>
        <p>
          We focus on the “why” behind healthy eating because understanding it can help
          you take small steps that make a big difference.
        </p>

        <ul>
          <li>Manage diabetes</li>
          <li>Lower high blood pressure</li>
          <li>Improve cholesterol</li>
          <li>Support a healthy weight</li>
          <li>Feel more energy day-to-day</li>
        </ul>

        <p>
          These resources are made for real-life situations, including times when food
          or money is limited. You’ll learn easy ways to stretch groceries, choose
          healthier options, and cook meals that support your health goals.
        </p>
        <p className="resourcesYouDeserve">
          You deserve tools that make healthy living possible—and we’re here to help.
        </p>
      </section>

      <section className="resourcesGrid">
        {resources.map((r) => (
          <article className="resourceCard" key={r.title}>
            <h3>{r.title}</h3>
            <p>{r.description}</p>

            <div className="resourceLinks">
              {r.links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  className="resourceLink"
                >
                  {l.label} →
                </a>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="resourcesDisclaimer">
        <h2>Legal Disclaimer</h2>
        <p>
          The organizations listed above are not affiliated with or endorsing the ChompSmart
          application. Videos and educational materials are linked from each organization’s
          official YouTube channel or website and are provided for educational purposes only.
          ChompSmart does not claim ownership of this content.
        </p>
      </section>
    </div>
  );
}