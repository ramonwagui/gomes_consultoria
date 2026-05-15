import type {
  RepasseReportByInstrumentPoint,
  RepasseReportMonthlyPoint,
  RepasseReportResponse
} from "../types";

export type ReportBar<T> = T & {
  width: number;
};

const buildBars = <T extends { valor: number }>(items: T[]): Array<ReportBar<T>> => {
  const max = Math.max(...items.map((item) => item.valor), 1);
  return items.map((item) => ({
    ...item,
    width: (item.valor / max) * 100
  }));
};

export type RepasseReportViewModel = {
  monthlyBars: Array<ReportBar<RepasseReportMonthlyPoint>>;
  instrumentBars: Array<ReportBar<RepasseReportByInstrumentPoint>>;
};

export const buildRepasseReportViewModel = (report: RepasseReportResponse): RepasseReportViewModel => ({
  monthlyBars: buildBars(report.series.repasses_mensais),
  instrumentBars: buildBars(report.series.repasses_por_instrumento)
});
