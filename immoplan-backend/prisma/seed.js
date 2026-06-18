import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

const data = JSON.parse(fs.readFileSync("./prisma/villes.json", "utf-8"));

async function main() {
  const batchSize = 500;

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);

    await prisma.villes.createMany({
      data: batch.map(v => ({
        nom: v.nom,
        zone: v.zone || "",
        geom: v.geom || "",
        code_postal: null
      })),
      skipDuplicates: true
    });

    console.log(`✔ Batch ${i} -> ${i + batch.length}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
