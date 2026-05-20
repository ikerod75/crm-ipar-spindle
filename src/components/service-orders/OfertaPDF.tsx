import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'

// ─── Types ───────────────────────────────────────────────────────────────────
export interface LineaVariable {
  id: string
  concepto: string
  qty: number
  precio: number
  dto: number
}

export interface OfertaDocData {
  numOferta: string
  fecha: string
  empresa: string
  direccion: string
  cpProvincia: string
  contacto: string
  tipoCabezal: string
  numSerie: string
  modeloMaquina: string
  numMaquina: string
  tipoCono: string
  rpm: string
  lubricacion: string
  lineas: LineaVariable[]
  baseImponible: number
  iva: number
  total: number
  plazoEntrega: string
  formaPago: string
  domiciliacion: string
  responsable: string
  vencimiento: string
  logoDataUrl: string
}

// ─── Colors ──────────────────────────────────────────────────────────────────
const NAVY   = '#1B3A6B'
const NAVY2  = '#EBF2FF'
const GRAY   = '#6B7280'
const GRAY2  = '#F3F4F6'
const BORDER = '#D1D5DB'
const WHITE  = '#FFFFFF'
const TEXT   = '#111827'

// ─── Fixed service lines ──────────────────────────────────────────────────────
const FIXED_SECTIONS = [
  {
    title: 'Recepción del cabezal',
    items: [
      'Identificación y codificación',
      'Realizar comprobaciones iniciales',
      'Medición de fuerza de amarres y saltos',
    ],
  },
  {
    title: 'Desmontaje completo',
    items: [
      'Medición en tridi. Componentes críticos',
      'Limpieza de todos los componentes',
      'Estudio visual componentes',
    ],
  },
  {
    title: 'Montaje Completo',
    items: [
      'Sustitución de nuevos rodamientos',
      'Sustitución de tóricas',
      'Sustitución de pequeños elementos',
      'Rectificado de distanciales',
    ],
  },
  { title: 'Test de rodaje', items: [] },
  { title: 'Informe final y expedición', items: [] },
]

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontSize: 8.5,
    fontFamily: 'Helvetica',
    color: TEXT,
    paddingTop: 36,
    paddingBottom: 52,
    paddingHorizontal: 36,
    lineHeight: 1.4,
  },

  // HEADER
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  headerLeft: { flex: 1, paddingRight: 20 },
  headerRight: { width: 195 },
  logo: { width: 150, height: 48, marginBottom: 7, objectFit: 'contain' },
  iparTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 7 },
  addressLine: { fontSize: 7.5, color: GRAY, lineHeight: 1.6 },

  ofertaRow: {
    flexDirection: 'row',
    backgroundColor: NAVY,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '5 8',
    marginBottom: 5,
  },
  ofertaLabel: { color: WHITE, fontSize: 7.5 },
  ofertaValue: { color: WHITE, fontSize: 9, fontFamily: 'Helvetica-Bold' },

  clientBox: {
    borderWidth: 1,
    borderColor: BORDER,
    padding: '7 9',
    fontSize: 8,
    lineHeight: 1.65,
  },
  clientName: { fontFamily: 'Helvetica-Bold', fontSize: 8.5, marginBottom: 2 },

  // SECTION HEADER
  secHeader: { backgroundColor: NAVY, padding: '4 8' },
  secHeaderText: { color: WHITE, fontSize: 8.5, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 },

  // TECHNICAL DATA
  techTable: { borderWidth: 1, borderColor: BORDER, borderTopWidth: 0, marginBottom: 14 },
  techRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: BORDER },
  techRowLast: { flexDirection: 'row' },
  techLbl: {
    width: '26%', backgroundColor: GRAY2, padding: '4 6',
    fontFamily: 'Helvetica-Bold', fontSize: 7.5,
    borderRightWidth: 0.5, borderRightColor: BORDER,
  },
  techVal: {
    width: '24%', padding: '4 6', fontSize: 8,
    borderRightWidth: 0.5, borderRightColor: BORDER,
  },
  techValFull: { flex: 1, padding: '4 6', fontSize: 8 },

  // FIXED TEXT
  fixedText: {
    fontSize: 7.5, color: GRAY, lineHeight: 1.75,
    marginTop: 12, marginBottom: 4,
    borderLeftWidth: 2, borderLeftColor: NAVY,
    paddingLeft: 8,
    fontFamily: 'Helvetica-Oblique',
  },

  // PRICING TABLE
  priceTable: { borderWidth: 1, borderColor: BORDER, borderTopWidth: 0 },
  pHeaderRow: {
    flexDirection: 'row', backgroundColor: NAVY2,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  pRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: BORDER },
  pRowAlt: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: BORDER, backgroundColor: GRAY2 },

  cCabezal:  { width: 62,  padding: '4 5', borderRightWidth: 0.5, borderRightColor: BORDER },
  cConcepto: { flex: 1,    padding: '4 5', borderRightWidth: 0.5, borderRightColor: BORDER },
  cQty:      { width: 28,  padding: '4 5', textAlign: 'center', borderRightWidth: 0.5, borderRightColor: BORDER },
  cPrecio:   { width: 54,  padding: '4 5', textAlign: 'right', borderRightWidth: 0.5, borderRightColor: BORDER },
  cDto:      { width: 32,  padding: '4 5', textAlign: 'right', borderRightWidth: 0.5, borderRightColor: BORDER },
  cImporte:  { width: 56,  padding: '4 5', textAlign: 'right' },

  phText: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: NAVY },
  cellTxt: { fontSize: 7.5 },
  cellSub: { fontSize: 7, color: GRAY, paddingLeft: 10, lineHeight: 1.6 },
  cellGray: { fontSize: 7.5, color: GRAY },

  // TOTALS
  totalsWrap: { alignSelf: 'flex-end', width: 205, marginTop: 8, borderWidth: 1, borderColor: BORDER },
  tRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 10, paddingVertical: 3,
    borderBottomWidth: 0.5, borderBottomColor: BORDER,
  },
  tRowFinal: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: NAVY,
  },
  tLabel: { fontSize: 8, color: GRAY },
  tValue: { fontSize: 8, fontFamily: 'Helvetica-Bold' },
  tLabelFinal: { fontSize: 9, color: WHITE, fontFamily: 'Helvetica-Bold' },
  tValueFinal: { fontSize: 9, color: WHITE, fontFamily: 'Helvetica-Bold' },

  // CONDITIONS
  condBox: { marginTop: 14, borderWidth: 1, borderColor: BORDER, padding: '8 10' },
  condTitle: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: NAVY, marginBottom: 6 },
  condRow: { flexDirection: 'row', marginBottom: 3 },
  condLbl: { fontSize: 7.5, color: GRAY, width: 90 },
  condVal: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', flex: 1 },

  // ACCEPTANCE
  acceptText: { fontSize: 9, color: GRAY, lineHeight: 1.8, marginTop: 20, marginBottom: 30 },
  sigTable: { flexDirection: 'row', borderWidth: 1, borderColor: BORDER, marginTop: 20 },
  sigCell: { flex: 1, padding: '8 10', height: 110, borderRightWidth: 1, borderRightColor: BORDER },
  sigCellLast: { flex: 1, padding: '8 10', height: 110 },
  sigLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 4 },

  // FOOTER
  footer: {
    position: 'absolute', bottom: 18, left: 36, right: 36,
    borderTopWidth: 0.5, borderTopColor: BORDER,
    paddingTop: 5, flexDirection: 'row', justifyContent: 'center',
  },
  footerTxt: { fontSize: 7, color: GRAY },
  divider: { borderTopWidth: 1.5, borderTopColor: NAVY, marginVertical: 10 },
})

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

function fmtDate(d: string) {
  try { const [y, m, day] = d.split('-'); return `${day}/${m}/${y}` } catch { return d }
}

function calcImporte(l: LineaVariable) {
  return l.precio * l.qty * (1 - l.dto / 100)
}

// ─── Shared sub-components ────────────────────────────────────────────────────
function PageHeader({ data }: { data: OfertaDocData }) {
  return (
    <View style={s.header} fixed>
      <View style={s.headerLeft}>
        {data.logoDataUrl
          ? <Image src={data.logoDataUrl} style={s.logo} />
          : <Text style={s.iparTitle}>IPAR SPINDLE</Text>
        }
        <Text style={s.addressLine}>C.I.F: B-75139444</Text>
        <Text style={s.addressLine}>Pol. Industrial Itziar Deba (Parcela A2)</Text>
        <Text style={s.addressLine}>CP 20829 Itziar, Guipúzcoa Spain</Text>
        <Text style={s.addressLine}>info@iparspindle.com</Text>
      </View>
      <View style={s.headerRight}>
        <View style={s.ofertaRow}>
          <Text style={s.ofertaLabel}>Nº OFERTA</Text>
          <Text style={s.ofertaValue}>{data.numOferta}</Text>
        </View>
        <View style={{ ...s.ofertaRow, backgroundColor: '#2D548A', marginBottom: 6 }}>
          <Text style={s.ofertaLabel}>FECHA</Text>
          <Text style={s.ofertaValue}>{fmtDate(data.fecha)}</Text>
        </View>
        <View style={s.clientBox}>
          {data.empresa ? <Text style={s.clientName}>{data.empresa}</Text> : null}
          {data.direccion ? <Text>{data.direccion}</Text> : null}
          {data.cpProvincia ? <Text>{data.cpProvincia}</Text> : null}
          {data.contacto ? <Text style={{ color: GRAY }}>Att. {data.contacto}</Text> : null}
        </View>
      </View>
    </View>
  )
}

function PageFooter() {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerTxt}>www.iparspindle.com  |  www.iparmaquina.com</Text>
    </View>
  )
}

// ─── PAGE 1 ───────────────────────────────────────────────────────────────────
function Page1({ data }: { data: OfertaDocData }) {
  const techRows = [
    [
      { lbl: 'Tipo de cabezal',          val: data.tipoCabezal },
      { lbl: 'Nº de serie del cabezal',  val: data.numSerie },
    ],
    [
      { lbl: 'Modelo de máquina',        val: data.modeloMaquina },
      { lbl: 'Nº de máquina',            val: data.numMaquina },
    ],
    [
      { lbl: 'Tipo de cono',             val: data.tipoCono },
      { lbl: 'RPM',                      val: data.rpm },
    ],
  ]

  return (
    <Page size="A4" style={s.page}>
      <PageHeader data={data} />
      <View style={s.divider} />

      {/* Technical data section */}
      <View style={s.secHeader}>
        <Text style={s.secHeaderText}>DATOS TÉCNICOS DEL CABEZAL</Text>
      </View>
      <View style={s.techTable}>
        {techRows.map((row, ri) => (
          <View key={ri} style={s.techRow}>
            <Text style={s.techLbl}>{row[0].lbl}</Text>
            <Text style={{ ...s.techVal }}>{row[0].val}</Text>
            <Text style={{ ...s.techLbl, width: '26%' }}>{row[1].lbl}</Text>
            <Text style={{ ...s.techVal, width: '24%', borderRightWidth: 0 }}>{row[1].val}</Text>
          </View>
        ))}
        <View style={s.techRowLast}>
          <Text style={s.techLbl}>Lubricación</Text>
          <Text style={s.techValFull}>{data.lubricacion}</Text>
        </View>
      </View>

      {/* Fixed text */}
      <Text style={s.fixedText}>
        {`Esta oferta ha sido realizada según las indicaciones proporcionadas por el cliente. En el caso de que usted encuentre dicha oferta válida, agradeceríamos pudieran enviar última página de este documento firmada y sellada haciendo mención al nº de oferta que se le indica.\n\nSi usted tuviera cualquier duda al respecto, por favor, indíquenoslo.\n\nLa oferta podrá ser revisada una vez el cabezal se encuentre totalmente desmontado y analizado.`}
      </Text>

      <PageFooter />
    </Page>
  )
}

// ─── PAGE 2 ───────────────────────────────────────────────────────────────────
function Page2({ data }: { data: OfertaDocData }) {
  let rowIndex = 0

  return (
    <Page size="A4" style={s.page}>
      <PageHeader data={data} />
      <View style={s.divider} />

      {/* Pricing table */}
      <View style={s.secHeader}>
        <Text style={s.secHeaderText}>TRABAJOS Y PRECIOS</Text>
      </View>
      <View style={s.priceTable}>
        {/* Header row */}
        <View style={s.pHeaderRow}>
          <Text style={{ ...s.cCabezal, ...s.phText }}>Cabezal</Text>
          <Text style={{ ...s.cConcepto, ...s.phText }}>Concepto</Text>
          <Text style={{ ...s.cQty, ...s.phText }}>Qty</Text>
          <Text style={{ ...s.cPrecio, ...s.phText }}>Precio</Text>
          <Text style={{ ...s.cDto, ...s.phText }}>Dto.%</Text>
          <Text style={{ ...s.cImporte, ...s.phText }}>Importe</Text>
        </View>

        {/* Fixed service lines */}
        {FIXED_SECTIONS.map((sec) => {
          const isAlt = rowIndex++ % 2 === 0
          return (
            <React.Fragment key={sec.title}>
              <View style={isAlt ? s.pRow : s.pRowAlt}>
                <Text style={{ ...s.cCabezal, ...s.cellGray }}>{rowIndex === 1 ? data.tipoCabezal : ''}</Text>
                <View style={s.cConcepto}>
                  <Text style={{ ...s.cellTxt, fontFamily: 'Helvetica-Bold' }}>{sec.title}</Text>
                  {sec.items.map(item => (
                    <Text key={item} style={s.cellSub}>· {item}</Text>
                  ))}
                </View>
                <Text style={s.cQty} />
                <Text style={s.cPrecio} />
                <Text style={s.cDto} />
                <Text style={s.cImporte} />
              </View>
            </React.Fragment>
          )
        })}

        {/* Variable lines */}
        {data.lineas.filter(l => l.concepto.trim()).map((l) => {
          const isAlt = rowIndex++ % 2 === 0
          const importe = calcImporte(l)
          return (
            <View key={l.id} style={isAlt ? s.pRow : s.pRowAlt}>
              <Text style={{ ...s.cCabezal, ...s.cellGray }}>{data.tipoCabezal}</Text>
              <Text style={{ ...s.cConcepto, ...s.cellTxt }}>{l.concepto}</Text>
              <Text style={{ ...s.cQty, ...s.cellTxt }}>{l.qty}</Text>
              <Text style={{ ...s.cPrecio, ...s.cellTxt }}>{fmt(l.precio)} €</Text>
              <Text style={{ ...s.cDto, ...s.cellTxt }}>{l.dto > 0 ? `${l.dto}%` : '—'}</Text>
              <Text style={{ ...s.cImporte, ...s.cellTxt, fontFamily: 'Helvetica-Bold' }}>{fmt(importe)} €</Text>
            </View>
          )
        })}
      </View>

      {/* Totals */}
      <View style={s.totalsWrap}>
        <View style={s.tRow}>
          <Text style={s.tLabel}>Base Imponible</Text>
          <Text style={s.tValue}>{fmt(data.baseImponible)} €</Text>
        </View>
        <View style={s.tRow}>
          <Text style={s.tLabel}>IVA 21%</Text>
          <Text style={s.tValue}>{fmt(data.iva)} €</Text>
        </View>
        <View style={s.tRow}>
          <Text style={s.tLabel}>Portes</Text>
          <Text style={s.tValue}>Pagados</Text>
        </View>
        <View style={s.tRowFinal}>
          <Text style={s.tLabelFinal}>TOTAL FACTURA</Text>
          <Text style={s.tValueFinal}>{fmt(data.total)} €</Text>
        </View>
      </View>

      {/* Conditions */}
      <View style={s.condBox}>
        <Text style={s.condTitle}>CONDICIONES</Text>
        {[
          { lbl: 'Plazo de entrega:', val: data.plazoEntrega },
          { lbl: 'Forma de pago:',   val: data.formaPago },
          { lbl: 'Domiciliación:',   val: data.domiciliacion },
          { lbl: 'Responsable:',     val: data.responsable },
          { lbl: 'Vencimiento:',     val: data.vencimiento },
        ].map(({ lbl, val }) => (
          <View key={lbl} style={s.condRow}>
            <Text style={s.condLbl}>{lbl}</Text>
            <Text style={s.condVal}>{val}</Text>
          </View>
        ))}
      </View>

      <PageFooter />
    </Page>
  )
}

// ─── PAGE 3 ───────────────────────────────────────────────────────────────────
function Page3({ data }: { data: OfertaDocData }) {
  return (
    <Page size="A4" style={s.page}>
      <PageHeader data={data} />
      <View style={s.divider} />

      <View style={s.secHeader}>
        <Text style={s.secHeaderText}>ACEPTACIÓN DE OFERTA</Text>
      </View>

      <Text style={s.acceptText}>
        Por este medio aceptamos la oferta indicada y para que así conste:
      </Text>

      <View style={s.sigTable}>
        {(['Fecha', 'Sello'] as const).map(label => (
          <View key={label} style={s.sigCell}>
            <Text style={s.sigLabel}>{label}</Text>
          </View>
        ))}
        <View style={s.sigCellLast}>
          <Text style={s.sigLabel}>Firma</Text>
        </View>
      </View>

      <PageFooter />
    </Page>
  )
}

// ─── Document ────────────────────────────────────────────────────────────────
export function OfertaDocument({ data }: { data: OfertaDocData }) {
  return (
    <Document title={`Oferta ${data.numOferta}`} author="Ipar Spindle" subject="Oferta de servicio">
      <Page1 data={data} />
      <Page2 data={data} />
      <Page3 data={data} />
    </Document>
  )
}
