/* eslint-disable jsx-a11y/alt-text -- @react-pdf Image is not a DOM <img> */
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { PdfBundle } from "@/lib/pdf/bundle";
import { pageCountForLayout, type PdfElement } from "@/lib/pdf/types";

const TEAL = "#3A9FBF";
const INK = "#1c1917";
const MUTED = "#57534e";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: INK,
  },
  box: { overflow: "hidden" },
  label: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: MUTED,
    marginBottom: 2,
  },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 1 },
  check: { width: 7, height: 7, borderWidth: 1, borderColor: INK },
  checkOn: {
    width: 7,
    height: 7,
    borderWidth: 1,
    borderColor: TEAL,
    backgroundColor: TEAL,
  },
  photo: { width: "32%", height: 90, objectFit: "cover", marginRight: 4, marginBottom: 4 },
  photos: { flexDirection: "row", flexWrap: "wrap" },
  sigRow: { flexDirection: "row", gap: 10 },
  sigImage: { width: 140, height: 40, objectFit: "contain" },
});

function BoundField({ bundle, element }: { bundle: PdfBundle; element: PdfElement }) {
  const key = element.questionKey ?? "";
  const question = bundle.questions.find((item) => item.question_key === key);
  const label =
    key === "__writer_name"
      ? "Report writer"
      : key === "__property_address"
        ? "Property address"
        : key === "__report_number"
          ? "Report"
          : question?.label ?? key;
  const value = bundle.displayByKey[key] ?? "—";
  const options = question?.options ?? [];
  const actual = bundle.valuesByKey[key];
  const showBoxes =
    question &&
    options.length > 0 &&
    options.length <= 12 &&
    element.height >= 18 + options.length * 11;

  return (
    <View style={styles.box}>
      <Text style={styles.label}>{label}</Text>
      {showBoxes ? (
        options.map((option) => {
          const selected = String(actual ?? "") === option.value || actual === (option.value === "true");
          return (
            <View key={option.id} style={styles.optionRow}>
              <View style={selected ? styles.checkOn : styles.check} />
              <Text>{option.label}</Text>
            </View>
          );
        })
      ) : (
        <Text>{value}</Text>
      )}
    </View>
  );
}

function ElementView({ bundle, element }: { bundle: PdfBundle; element: PdfElement }) {
  const style = {
    position: "absolute" as const,
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    overflow: "hidden" as const,
  };

  switch (element.type) {
    case "page_break":
      return null;
    case "logo":
      return bundle.branding && bundle.logoDataUri ? (
        <Image src={bundle.logoDataUri} style={style} />
      ) : null;
    case "banner":
      return bundle.branding && bundle.bannerDataUri ? (
        <Image src={bundle.bannerDataUri} style={style} />
      ) : null;
    case "divider":
      return (
        <View
          style={{
            ...style,
            height: 1,
            backgroundColor: "#d6d3d1",
          }}
        />
      );
    case "static_text":
      return (
        <View style={style}>
          <Text style={{ fontSize: element.fontSize ?? 10 }}>
            {element.text ?? ""}
          </Text>
        </View>
      );
    case "report_meta":
      return (
        <View style={style}>
          <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: TEAL }}>
            {bundle.orgName}
          </Text>
          <Text style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>
            {bundle.report.report_number}
            {bundle.agencyName ? `  ·  ${bundle.agencyName}` : ""}
          </Text>
        </View>
      );
    case "bound_field":
      return (
        <View style={style}>
          <BoundField bundle={bundle} element={element} />
        </View>
      );
    case "narrative": {
      const key = element.questionKey ?? "original_summary";
      const question = bundle.questions.find((item) => item.question_key === key);
      return (
        <View style={style}>
          <Text style={styles.label}>{question?.label ?? "What happened?"}</Text>
          <Text>
            {bundle.displayByKey[key] === "—" ? "" : bundle.displayByKey[key]}
          </Text>
        </View>
      );
    }
    case "vehicles":
      if (!bundle.vehicles.length) return null;
      return (
        <View style={style}>
          <Text style={styles.label}>Vehicles</Text>
          {bundle.vehicles.map((vehicle, index) => (
            <Text key={index}>
              {[vehicle.color, vehicle.make_model, vehicle.license_plate, vehicle.driver_name]
                .filter(Boolean)
                .join(" · ") || "—"}
            </Text>
          ))}
        </View>
      );
    case "photos":
      if (!bundle.photos.length) return null;
      return (
        <View style={style}>
          <Text style={styles.label}>Photos</Text>
          <View style={styles.photos}>
            {bundle.photos.map((photo) => (
              <Image key={photo.filename} src={photo.dataUri} style={styles.photo} />
            ))}
          </View>
        </View>
      );
    case "signatures":
      return (
        <View style={style}>
          <View style={styles.sigRow}>
            <View>
              <Text style={styles.label}>Officer</Text>
              {bundle.officerSignature ? (
                <Image src={bundle.officerSignature} style={styles.sigImage} />
              ) : (
                <Text>—</Text>
              )}
              <Text style={{ fontSize: 7, color: MUTED }}>
                {bundle.report.officer_signed_at
                  ? new Date(bundle.report.officer_signed_at).toLocaleString()
                  : ""}
              </Text>
            </View>
            <View>
              <Text style={styles.label}>Administrator</Text>
              {bundle.adminSignature ? (
                <Image src={bundle.adminSignature} style={styles.sigImage} />
              ) : (
                <Text>—</Text>
              )}
              <Text style={{ fontSize: 7, color: MUTED }}>
                {bundle.report.admin_signed_at
                  ? new Date(bundle.report.admin_signed_at).toLocaleString()
                  : ""}
              </Text>
            </View>
          </View>
        </View>
      );
    default:
      return null;
  }
}

export function CustomReportPdf({ bundle }: { bundle: PdfBundle }) {
  const layout = bundle.layout;
  if (!layout) return null;
  const pages = pageCountForLayout(layout);

  return (
    <Document title={`${bundle.report.report_number} incident report`}>
      {Array.from({ length: pages }, (_, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          {layout.elements
            .filter((element) => element.page === pageIndex)
            .map((element) => (
              <ElementView key={element.id} bundle={bundle} element={element} />
            ))}
        </Page>
      ))}
    </Document>
  );
}
