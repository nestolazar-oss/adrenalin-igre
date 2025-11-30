import fs from 'fs';
import path from 'path';
import countriesSr from 'world_countries_lists/data/countries/sr.json'; // sr = srpski

// Funkcija za emoji zastavu od ISO alfa-2 koda
function countryCodeToEmoji(code) {
  return code
    .toUpperCase()
    .split('')
    .map(c => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join('');
}

// Napravi niz sa JSON objektima za svaku državu
const countries = countriesSr.map(c => {
  return {
    code: c.alpha2.toUpperCase(),       // ISO alfa-2 kod, npr. "US", "RS"
    country_sr: c.name,                  // ime države na srpskom iz paketa
    flag: countryCodeToEmoji(c.alpha2)   // emoji zastava
  };
});

// Path gde će se upisati fajl
const outPath = path.join(process.cwd(), 'countries.json');

// Upisuj JSON fajl
fs.writeFileSync(outPath, JSON.stringify(countries, null, 2), 'utf-8');

console.log(`Written ${countries.length} countries to ${outPath}`);
