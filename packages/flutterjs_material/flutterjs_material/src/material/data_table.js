import { StatelessWidget } from '../core/widget_element.js';
import { Container, BoxDecoration } from './container.js';
import { Column, Row, SizedBox, Expanded } from '../widgets/widgets.js';
import { Text } from './text.js';
import { Checkbox } from './checkbox.js';
import { Divider } from '../widgets/compoment/divider.js';
import { DataTableTheme } from './data_table_theme.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { MainAxisAlignment, CrossAxisAlignment, MainAxisSize } from '../utils/utils.js';

export class DataColumn {
    constructor({
        label,
        tooltip,
        numeric = false,
        onSort,
    } = {}) {
        this.label = label;
        this.tooltip = tooltip;
        this.numeric = numeric;
        this.onSort = onSort;
    }
}

export class DataRow {
    constructor({
        key,
        selected = false,
        onSelectChanged,
        color,
        cells = [],
    } = {}) {
        this.key = key;
        this.selected = selected;
        this.onSelectChanged = onSelectChanged;
        this.color = color;
        this.cells = cells;
    }
}

export class DataCell {
    constructor(child, {
        placeholder = false,
        showEditIcon = false,
        onTap,
    } = {}) {
        this.child = child;
        this.placeholder = placeholder;
        this.showEditIcon = showEditIcon;
        this.onTap = onTap;
    }
}

export class DataTable extends StatelessWidget {
    constructor({
        key,
        columns = [],
        sortColumnIndex,
        sortAscending = true,
        onSelectAll,
        dataRowColor,
        dataRowHeight,
        dataRowMinHeight,
        dataRowMaxHeight,
        dataTextStyle,
        headingRowColor,
        headingRowHeight,
        headingTextStyle,
        horizontalMargin,
        columnSpacing,
        showCheckboxColumn = true,
        showBottomBorder = false,
        dividerThickness,
        rows = [],
    } = {}) {
        super(key);
        this.columns = columns;
        this.sortColumnIndex = sortColumnIndex;
        this.sortAscending = sortAscending;
        this.onSelectAll = onSelectAll;
        this.dataRowColor = dataRowColor;
        this.dataRowHeight = dataRowHeight;
        this.dataRowMinHeight = dataRowMinHeight;
        this.dataRowMaxHeight = dataRowMaxHeight;
        this.dataTextStyle = dataTextStyle;
        this.headingRowColor = headingRowColor;
        this.headingRowHeight = headingRowHeight;
        this.headingTextStyle = headingTextStyle;
        this.horizontalMargin = horizontalMargin;
        this.columnSpacing = columnSpacing;
        this.showCheckboxColumn = showCheckboxColumn;
        this.showBottomBorder = showBottomBorder;
        this.dividerThickness = dividerThickness;
        this.rows = rows;
    }

    build(context) {
        const theme = DataTableTheme.of(context) || {};
        const effectiveHeadingRowHeight = this.headingRowHeight || theme.headingRowHeight || 56.0;
        const effectiveDataRowMinHeight = this.dataRowMinHeight || theme.dataRowMinHeight || 48.0;
        const effectiveHorizontalMargin = this.horizontalMargin || theme.horizontalMargin || 24.0;
        const effectiveColumnSpacing = this.columnSpacing || theme.columnSpacing || 56.0;
        const effectiveDividerThickness = this.dividerThickness || theme.dividerThickness || 1.0;

        // Simplified Table Implementation using Column of Rows (since Table widget might not be fully feature complete in JS backend yet or we prefer flex)
        // Ideally we use HTML <table> if VNode allows or CSS Grid. 
        // Using Row/Column/Container for pure widget composition.

        const tableRows = [];

        // Heading
        const headingCells = [];
        if (this.showCheckboxColumn) {
            headingCells.push(new Container({
                width: 48.0, // Checkbox width
                alignment: 'center',
                child: new Checkbox({
                    value: this.rows.every(r => r.selected), // Naive check
                    onChanged: this.onSelectAll
                })
            }));
        }

        this.columns.forEach(col => {
            headingCells.push(new Expanded({
                child: new Container({
                    padding: EdgeInsets.symmetric({ horizontal: effectiveHorizontalMargin / 2 }), // Half margin
                    alignment: col.numeric ? 'centerRight' : 'centerLeft',
                    child: col.label // Assuming label is Text widget
                })
            }));
            // Add spacing if not last? Expanded handles generic spacing but fixed spacing requires SizedBox
            // Using Expanded for now for equal width distribution simplified
        });

        tableRows.push(new Container({
            height: effectiveHeadingRowHeight,
            style: { borderBottom: `1px solid ${theme.dividerColor || 'rgba(0,0,0,0.12)'}` }, // Explicit border for heading
            color: this.headingRowColor || theme.headingRowColor || Theme.of(context).colorScheme.surfaceContainerHighest || '#E6E0E9', // M3 Header
            child: new Row({
                children: headingCells
            })
        }));

        tableRows.push(new Divider({ height: effectiveDividerThickness, thickness: effectiveDividerThickness }));

        // Rows
        this.rows.forEach(row => {
            const dataCells = [];

            if (this.showCheckboxColumn) {
                dataCells.push(new Container({
                    width: 48.0,
                    alignment: 'center',
                    child: new Checkbox({
                        value: row.selected,
                        onChanged: row.onSelectChanged
                    })
                }));
            }

            row.cells.forEach((cell, index) => {
                const col = this.columns[index];
                dataCells.push(new Expanded({
                    child: new Container({
                        padding: EdgeInsets.symmetric({ horizontal: effectiveHorizontalMargin / 2 }),
                        alignment: col?.numeric ? 'centerRight' : 'centerLeft',
                        child: cell.child
                    })
                }));
            });

            tableRows.push(new Container({
                height: effectiveDataRowMinHeight, // Simplified
                color: this.dataRowColor || (row.selected ? theme.dataRowColor : null), // selection handling needs MaterialStateColor ideally
                child: new Row({
                    children: dataCells
                })
            }));

            tableRows.push(new Divider({ height: effectiveDividerThickness, thickness: effectiveDividerThickness }));
        });

        return new Container({
            child: new Column({
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: tableRows
            })
        });
    }
}
