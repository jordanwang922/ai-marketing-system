-- AlterTable
ALTER TABLE "ConsultingCase" ADD COLUMN     "currency" TEXT,
ADD COLUMN     "price" DOUBLE PRECISION,
ADD COLUMN     "requirements" TEXT;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "aiEvaluatedAt" TIMESTAMP(3),
ADD COLUMN     "aiNotes" TEXT,
ADD COLUMN     "aiRequestedAt" TIMESTAMP(3),
ADD COLUMN     "aiStatus" TEXT,
ADD COLUMN     "lastActivityAt" TIMESTAMP(3);
