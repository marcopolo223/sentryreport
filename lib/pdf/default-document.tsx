/* eslint-disable jsx-a11y/alt-text -- @react-pdf Image is not a DOM <img> */
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { PdfBundle, PdfQuestion } from "@/lib/pdf/bundle";
import { stringifyAnswer } from "@/lib/questions";
import type { Json } from "@/lib/supabase/types";

const TEAL = "#3A9FBF";
const INK = "#1c1917";
const MUTED = "#57534e";
const RULE = "#d6d3d1";
const FILL = "#f5f5f4";

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 36,
    paddingHorizontal: 28,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: INK,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  logo: {
    width: 56,
    height: 36,
    objectFit: "contain",
  },
  titleBlock: { flex: 1 },
  orgName: { fontSize: 14, fontFamily: "Helvetica-Bold", color: TEAL },
  reportNo: { marginTop: 2, fontSize: 10, color: MUTED },
  banner: {
    width: "100%",
    height: 42,
    objectFit: "cover",
    marginBottom: 8,
  },
  grid: {
    borderWidth: 1,
    borderColor: INK,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: INK,
  },
  lastRow: {
    flexDirection: "row",
  },
  label: {
    width: 132,
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: FILL,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: MUTED,
    borderRightWidth: 1,
    borderRightColor: INK,
  },
  value: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 9,
  },
  optionList: { gap: 2 },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  box: {
    width: 8,
    height: 8,
    borderWidth: 1,
    borderColor: INK,
  },
  boxOn: {
    width: 8,
    height: 8,
    borderWidth: 1,
    borderColor: TEAL,
    backgroundColor: TEAL,
  },
  narrative: {
    minHeight: 72,
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontSize: 9,
    lineHeight: 1.4,
  },
  sectionTitle: {
    marginTop: 10,
    marginBottom: 4,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: TEAL,
  },
  photoRow: { flexDirection: "row", gap: 6, marginBottom: 6 },
  photo: { width: 170, height: 120, objectFit: "cover" },
  sigRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  sigCol: { flex: 1 },
  sigImage: { width: 160, height: 48, objectFit: "contain" },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 28,
    right: 28,
    fontSize: 7,
    color: MUTED,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  muted: { color: MUTED, fontSize: 8 },
});

function optionValues(question: PdfQuestion): { value: string; label: string }[] {
  if (question.options.length > 0) {
    return question.options.map((option) => ({
      value: option.value,
      label: option.label,
    }));
  }
  if (question.field_type === "boolean") {
    return [
      { value: "true", label: "Yes" },
      { value: "false", label: "No" },
    ];
  }
  return [];
}

function isSelected(question: PdfQuestion, optionValue: string, actual: unknown) {
  if (question.field_type === "multi_select" && Array.isArray(actual)) {
    return actual.map((item) => stringifyAnswer(item as Json)).includes(optionValue);
  }
  return stringifyAnswer(actual as Json) === optionValue;
}

function FieldRows({
  bundle,
  questions,
}: {
  bundle: PdfBundle;
  questions: PdfQuestion[];
}) {
  return (
    <View style={styles.grid}>
      {questions.map((question, index) => {
        const last = index === questions.length - 1;
        const options = optionValues(question);
        const useBoxes =
          options.length > 0 &&
          options.length <= 12 &&
          question.question_key !== "building" &&
          question.question_key !== "unit";
        const actual = bundle.valuesByKey[question.question_key];
        const isNarrative = question.question_key === "original_summary";

        return (
          <View key={question.id} style={last ? styles.lastRow : styles.row} wrap={isNarrative}>
            <Text style={styles.label}>{question.label}</Text>
            {isNarrative ? (
              <Text style={styles.narrative}>
                {bundle.displayByKey[question.question_key] === "—"
                  ? ""
                  : bundle.displayByKey[question.question_key]}
              </Text>
            ) : useBoxes ? (
              <View style={[styles.value, styles.optionList]}>
                {options.map((option) => (
                  <View key={option.value} style={styles.optionRow}>
                    <View
                      style={
                        isSelected(question, option.value, actual)
                          ? styles.boxOn
                          : styles.box
                      }
                    />
                    <Text>{option.label}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.value}>
                {bundle.displayByKey[question.question_key] ?? "—"}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

export function DefaultReportPdf({ bundle }: { bundle: PdfBundle }) {
  const questions = bundle.visibleQuestions;
  const signedOfficer = bundle.report.officer_signed_at
    ? new Date(bundle.report.officer_signed_at).toLocaleString()
    : "";
  const signedAdmin = bundle.report.admin_signed_at
    ? new Date(bundle.report.admin_signed_at).toLocaleString()
    : "";

  return (
    <Document title={`${bundle.report.report_number} incident report`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          {bundle.branding && bundle.logoDataUri ? (
            <Image src={bundle.logoDataUri} style={styles.logo} />
          ) : null}
          <View style={styles.titleBlock}>
            <Text style={styles.orgName}>{bundle.orgName}</Text>
            <Text style={styles.reportNo}>
              {bundle.report.report_number}
              {bundle.agencyName ? `  ·  ${bundle.agencyName}` : ""}
            </Text>
          </View>
        </View>

        {bundle.branding && bundle.bannerDataUri ? (
          <Image src={bundle.bannerDataUri} style={styles.banner} />
        ) : null}

        <View style={styles.grid}>
          <View style={styles.row}>
            <Text style={styles.label}>Report writer</Text>
            <Text style={styles.value}>
              {bundle.displayByKey.__writer_name ?? "—"}
            </Text>
          </View>
          <View style={styles.lastRow}>
            <Text style={styles.label}>Property address</Text>
            <Text style={styles.value}>
              {bundle.displayByKey.__property_address ?? "—"}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Incident</Text>
        <FieldRows bundle={bundle} questions={questions} />

        {bundle.valuesByKey.vehicles_involved && bundle.vehicles.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Vehicles</Text>
            <View style={styles.grid}>
              {bundle.vehicles.map((vehicle, index) => (
                <View
                  key={index}
                  style={
                    index === bundle.vehicles.length - 1 ? styles.lastRow : styles.row
                  }
                >
                  <Text style={styles.label}>Vehicle {index + 1}</Text>
                  <Text style={styles.value}>
                    {[vehicle.color, vehicle.make_model, vehicle.license_plate, vehicle.driver_name]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {bundle.photos.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Photos</Text>
            {chunk(bundle.photos, 3).map((row, rowIndex) => (
              <View key={rowIndex} style={styles.photoRow} wrap={false}>
                {row.map((photo) => (
                  <Image key={photo.filename} src={photo.dataUri} style={styles.photo} />
                ))}
              </View>
            ))}
          </>
        ) : null}

        {bundle.videos.length > 0 ? (
          <Text style={[styles.muted, { marginTop: 8 }]}>
            Video files are included beside this PDF in the export ZIP:{" "}
            {bundle.videos.map((file) => file.filename).join(", ")}
          </Text>
        ) : null}

        <Text style={styles.sectionTitle}>Signatures</Text>
        <View style={styles.sigRow}>
          <View style={styles.sigCol}>
            <Text style={styles.muted}>Officer</Text>
            {bundle.officerSignature ? (
              <Image src={bundle.officerSignature} style={styles.sigImage} />
            ) : (
              <Text style={styles.value}>—</Text>
            )}
            <Text style={styles.muted}>{signedOfficer}</Text>
          </View>
          <View style={styles.sigCol}>
            <Text style={styles.muted}>Administrator</Text>
            {bundle.adminSignature ? (
              <Image src={bundle.adminSignature} style={styles.sigImage} />
            ) : (
              <Text style={styles.value}>—</Text>
            )}
            <Text style={styles.muted}>{signedAdmin}</Text>
          </View>
        </View>

        {bundle.amendments.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Amendments</Text>
            <View style={styles.grid}>
              {bundle.amendments.map((amendment, index) => (
                <View
                  key={index}
                  style={
                    index === bundle.amendments.length - 1
                      ? styles.lastRow
                      : styles.row
                  }
                >
                  <Text style={styles.label}>
                    {new Date(amendment.createdAt).toLocaleString()}
                  </Text>
                  <Text style={styles.value}>
                    {amendment.authorName}: {amendment.body}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <View style={styles.footer} fixed>
          <Text>{bundle.orgName}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${bundle.report.report_number}  ·  ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

function chunk<T>(items: T[], size: number) {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}
