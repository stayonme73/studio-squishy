import {
  packageComparisonColumns,
  packageComparisonCopy,
  packageComparisonRows,
} from "@/config/package-comparison";

type Props = {
  showTitle?: boolean;
  showLead?: boolean;
  showNote?: boolean;
  className?: string;
};

/** SPARK / MOMENTUM / GROWTH comparison — shared by Help Center and Studio Guide. */
export default function PackageComparisonTable({
  showTitle = true,
  showLead = true,
  showNote = true,
  className = "",
}: Props) {
  return (
    <div className={`pkg-compare${className ? ` ${className}` : ""}`}>
      {showTitle ? <h3 className="pkg-compare__title">{packageComparisonCopy.title}</h3> : null}
      {showLead ? <p className="pkg-compare__lead">{packageComparisonCopy.lead}</p> : null}

      <div className="pkg-compare__scroll">
        <table className="pkg-compare__table">
          <caption className="sr-only">{packageComparisonCopy.title}</caption>
          <thead>
            <tr>
              <th scope="col" className="pkg-compare__feature-head">
                Included
              </th>
              {packageComparisonColumns.map((column) => (
                <th key={column.id} scope="col" className="pkg-compare__pkg-head">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {packageComparisonRows.map((row) => (
              <tr key={row.id}>
                <th scope="row" className="pkg-compare__feature">
                  {row.label}
                </th>
                <td className="pkg-compare__cell">{row.spark}</td>
                <td className="pkg-compare__cell">{row.momentum}</td>
                <td className="pkg-compare__cell">{row.growth}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNote ? <p className="pkg-compare__note">{packageComparisonCopy.note}</p> : null}
    </div>
  );
}
