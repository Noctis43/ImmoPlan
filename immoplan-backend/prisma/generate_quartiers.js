import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();


const quartiers = JSON.parse(
  fs.readFileSync("./prisma/quartiers.json", "utf-8")
);


const villes = await prisma.villes.findMany();


function findVille(quartierNom) {
  return villes.find(v =>
    quartierNom?.toLowerCase().includes(v.nom.toLowerCase())
  );
}

async function main() {
  const dataToInsert = [];

  for (const q of quartiers) {
    if (!q.nom) continue;

    const ville = findVille(q.nom);

    if (!ville) continue; // ignore si pas de match

    dataToInsert.push({
      ville_id: ville.id,
      nom: q.nom,
      geom: q.geom || "",
      zone: q.zone || ""
    });
  }

  console.log("Quartiers prêts :", dataToInsert.length);

  const batchSize = 500;

  for (let i = 0; i < dataToInsert.length; i += batchSize) {
    await prisma.quartiers.createMany({
      data: dataToInsert.slice(i, i + batchSize),
      skipDuplicates: true
    });

    console.log(`✔ batch ${i} -> ${i + batchSize}`);
  }

  console.log("✔ INSERT terminé");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());