"use client";

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { ProjectPack } from "@/lib/pack/buildPack";

/**
 * The printable Project Pack.
 *
 * Built as a real structured PDF document rather than a screenshot of the page,
 * so the text is selectable, the pagination is sensible, and it prints cleanly.
 * Uses the built-in Helvetica family — no font downloads, works offline.
 */

const ink = "#16181D";
const muted = "#5B6270";
const subtle = "#838A97";
const line = "#E5E3DC";
const brand = "#0F5F52";
const brandSoft = "#E3F0EC";
const accent = "#C2620F";

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 44,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: ink,
    lineHeight: 1.45,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: line,
    paddingBottom: 12,
    marginBottom: 18,
  },
  brand: { fontSize: 14, lineHeight: 1.25, fontFamily: "Helvetica-Bold", color: brand },
  tagline: { fontSize: 7.5, color: subtle, marginTop: 2, maxWidth: 220 },
  metaRight: { alignItems: "flex-end" },
  metaLabel: { fontSize: 7, color: subtle, textTransform: "uppercase", letterSpacing: 0.6 },
  metaValue: { fontSize: 9, color: muted, marginTop: 1 },

  // Large type needs an explicit lineHeight — the page-level 1.45 does not
  // reserve enough box height at these sizes and the next line rides up into it.
  title: { fontSize: 19, lineHeight: 1.25, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  subtitle: { fontSize: 9, lineHeight: 1.3, color: muted, marginBottom: 16 },

  hero: {
    backgroundColor: brandSoft,
    borderRadius: 6,
    padding: 14,
    marginBottom: 18,
  },
  heroLabel: {
    fontSize: 7.5,
    color: brand,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    fontFamily: "Helvetica-Bold",
  },
  heroValue: {
    fontSize: 26,
    lineHeight: 1.2,
    fontFamily: "Helvetica-Bold",
    color: "#073A32",
    marginTop: 5,
    marginBottom: 4,
  },
  heroSub: { fontSize: 9, lineHeight: 1.35, color: "#0A4A40" },

  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 11,
    lineHeight: 1.3,
    fontFamily: "Helvetica-Bold",
    marginBottom: 7,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: line,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3.5,
    borderBottomWidth: 0.5,
    borderBottomColor: line,
  },
  rowLabel: { color: muted, flex: 1, paddingRight: 12 },
  rowValue: { fontFamily: "Helvetica-Bold", textAlign: "right" },
  rowNote: { fontSize: 7.5, color: subtle },

  tableHead: {
    flexDirection: "row",
    backgroundColor: "#F2F1EC",
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableHeadCell: { fontSize: 7.5, color: muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.4 },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: line,
  },
  colName: { flex: 3.2, paddingRight: 8 },
  colQty: { flex: 1.3, textAlign: "right", paddingRight: 8 },
  colUnit: { flex: 1.5, textAlign: "right", paddingRight: 8 },
  colCost: { flex: 1.1, textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 6,
    backgroundColor: "#F2F1EC",
  },

  badge: {
    fontSize: 6.5,
    color: accent,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },

  checkItem: { flexDirection: "row", paddingVertical: 3.5, alignItems: "flex-start" },
  checkBox: {
    width: 9,
    height: 9,
    borderWidth: 1,
    borderColor: "#B4B0A4",
    borderRadius: 1.5,
    marginRight: 7,
    marginTop: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: { fontSize: 7, color: brand, fontFamily: "Helvetica-Bold", lineHeight: 1 },

  stepItem: { flexDirection: "row", paddingVertical: 2.5 },
  stepNumber: { width: 16, color: subtle, fontFamily: "Helvetica-Bold" },

  scenarioGrid: { flexDirection: "row", gap: 10 },
  scenarioCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 5,
    padding: 9,
  },
  scenarioCardTop: { borderColor: brand, backgroundColor: brandSoft },
  scenarioName: { fontFamily: "Helvetica-Bold", fontSize: 9.5 },
  scenarioSummary: { fontSize: 8, color: muted, marginTop: 2, marginBottom: 5 },

  warning: {
    backgroundColor: "#FDF1E3",
    borderRadius: 4,
    padding: 8,
    marginBottom: 5,
    fontSize: 8.5,
  },

  notesBox: {
    borderWidth: 1,
    borderColor: line,
    borderRadius: 5,
    padding: 10,
    minHeight: 54,
    fontSize: 9,
    color: muted,
  },

  disclaimer: { fontSize: 7.5, color: subtle, lineHeight: 1.4 },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: line,
    paddingTop: 6,
    fontSize: 7.5,
    color: subtle,
  },
});

function Footer({ pack }: { pack: ProjectPack }) {
  return (
    <View style={styles.footer} fixed>
      <Text>
        {pack.brand} — planning estimate only. Verify before you buy.
      </Text>
      <Text
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

export function PackDocument({ pack }: { pack: ProjectPack }) {
  return (
    <Document
      title={pack.title}
      author={pack.brand}
      subject={`${pack.projectName} project plan`}
      creator={pack.brand}
      producer={pack.brand}
    >
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.brand}>{pack.brand}</Text>
            <Text style={styles.tagline}>{pack.tagline}</Text>
          </View>
          <View style={styles.metaRight}>
            <Text style={styles.metaLabel}>Project pack</Text>
            <Text style={styles.metaValue}>{pack.createdAt}</Text>
          </View>
        </View>

        <Text style={styles.title}>{pack.title}</Text>
        <Text style={styles.subtitle}>
          {pack.category} · {pack.effort.difficulty} · {pack.effort.timeCategory}
        </Text>

        <View style={styles.hero}>
          <Text style={styles.heroLabel}>{pack.headline.label}</Text>
          <Text style={styles.heroValue}>{pack.headline.value}</Text>
          {pack.headline.sublabel ? (
            <Text style={styles.heroSub}>{pack.headline.sublabel}</Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project summary</Text>
          {pack.summary.map((row) => (
            <View key={row.label} style={styles.row}>
              <View style={styles.rowLabel}>
                <Text>{row.label}</Text>
                {row.note ? <Text style={styles.rowNote}>{row.note}</Text> : null}
              </View>
              <Text style={styles.rowValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Materials & budget</Text>
          <View style={styles.tableHead}>
            <Text style={[styles.tableHeadCell, styles.colName]}>Item</Text>
            <Text style={[styles.tableHeadCell, styles.colQty]}>Quantity</Text>
            <Text style={[styles.tableHeadCell, styles.colUnit]}>Unit price</Text>
            <Text style={[styles.tableHeadCell, styles.colCost]}>Cost</Text>
          </View>
          {pack.materials.map((item, index) => (
            <View key={`${item.name}-${index}`} style={styles.tableRow}>
              <View style={styles.colName}>
                <Text>
                  {item.name}
                  {item.isEstimate ? <Text style={styles.badge}>  Estimate</Text> : null}
                </Text>
                {item.note ? <Text style={styles.rowNote}>{item.note}</Text> : null}
              </View>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colUnit}>{item.unitPrice}</Text>
              <Text style={styles.colCost}>{item.cost}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={[styles.colName, { fontFamily: "Helvetica-Bold" }]}>
              Estimated material total
            </Text>
            <Text style={[styles.colCost, { fontFamily: "Helvetica-Bold" }]}>
              {pack.costTotal}
            </Text>
          </View>
          <Text style={[styles.rowNote, { marginTop: 5 }]}>{pack.budgetNote}</Text>
          {pack.contractorQuote ? (
            <Text style={[styles.rowNote, { marginTop: 2 }]}>
              Contractor quote on file: {pack.contractorQuote}.
            </Text>
          ) : null}
        </View>

        {pack.scenarios.length > 0 ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Options compared</Text>
            <View style={styles.scenarioGrid}>
              {pack.scenarios.map((scenario) => (
                <View
                  key={scenario.name}
                  style={[
                    styles.scenarioCard,
                    ...(scenario.recommended ? [styles.scenarioCardTop] : []),
                  ]}
                >
                  <Text style={styles.scenarioName}>{scenario.name}</Text>
                  <Text style={styles.scenarioSummary}>{scenario.summary}</Text>
                  {scenario.rows.map((row) => (
                    <View key={row.label} style={styles.row}>
                      <Text style={styles.rowLabel}>{row.label}</Text>
                      <Text style={styles.rowValue}>{row.value}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shopping list</Text>
          {pack.checklist.map((item, index) => (
            <View key={`${item.label}-${index}`} style={styles.checkItem} wrap={false}>
              <View style={styles.checkBox}>
                {item.checked ? <Text style={styles.checkMark}>X</Text> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text>
                  {item.label}
                  {item.optional ? <Text style={styles.rowNote}>  (optional)</Text> : null}
                </Text>
                {item.detail ? <Text style={styles.rowNote}>{item.detail}</Text> : null}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project sequence</Text>
          {pack.steps.map((step, index) => (
            <View key={step} style={styles.stepItem} wrap={false}>
              <Text style={styles.stepNumber}>{index + 1}.</Text>
              <Text style={{ flex: 1 }}>{step}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Assumptions used</Text>
          {pack.assumptions.map((row) => (
            <View key={row.label} style={styles.row}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text style={styles.rowValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>How it was calculated</Text>
          {pack.formulas.map((row) => (
            <View key={row.label} style={styles.row}>
              <View style={styles.rowLabel}>
                <Text>{row.label}</Text>
                <Text style={styles.rowNote}>{row.note}</Text>
              </View>
              <Text style={[styles.rowValue, { flex: 1.6 }]}>{row.value}</Text>
            </View>
          ))}
        </View>

        {pack.warnings.length > 0 ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Before you start</Text>
            {pack.warnings.map((warning, index) => (
              <Text key={index} style={styles.warning}>
                {warning}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notesBox}>{pack.notes || " "}</Text>
        </View>

        <Text style={styles.disclaimer}>{pack.disclaimer}</Text>

        <Footer pack={pack} />
      </Page>
    </Document>
  );
}
