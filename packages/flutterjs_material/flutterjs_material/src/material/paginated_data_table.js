// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatefulWidget, State } from '../core/widget_element.js';
import { Container } from './container.js';
import { Row, Column, SizedBox } from '../widgets/widgets.js';
import { Icon, Icons } from './icon.js';
import { IconButton } from './icon_button.js';
import { Text } from './text.js';
import { Card } from './card.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { MainAxisSize, MainAxisAlignment, CrossAxisAlignment } from '../utils/utils.js';
import { Theme } from './theme.js';

export class PaginatedDataTable extends StatefulWidget {
    constructor({
        key, header, actions, columns = [], sortColumnIndex, sortAscending = true,
        onSelectAll, headingRowHeight = 56.0, horizontalMargin = 24.0,
        showCheckboxColumn = true, showFirstLastButtons = false,
        initialFirstRowIndex = 0, onPageChanged, rowsPerPage = 10,
        availableRowsPerPage = [10, 20, 50, 100], onRowsPerPageChanged, source,
    } = {}) {
        super(key);
        Object.assign(this, {
            header, actions, columns, sortColumnIndex, sortAscending,
            onSelectAll, showCheckboxColumn, showFirstLastButtons,
            initialFirstRowIndex, onPageChanged, rowsPerPage,
            availableRowsPerPage, onRowsPerPageChanged, source, headingRowHeight, horizontalMargin,
        });
    }
    createState() { return new PaginatedDataTableState(); }
}

class PaginatedDataTableState extends State {
    constructor() { super(); this.firstRowIndex = 0; }
    initState() { this.firstRowIndex = this.widget.initialFirstRowIndex || 0; }

    get _rowCount() { return this.widget.source?.rowCount || 0; }

    _handlePrev() {
        this.setState(() => { this.firstRowIndex = Math.max(0, this.firstRowIndex - this.widget.rowsPerPage); });
        this.widget.onPageChanged?.(this.firstRowIndex);
    }
    _handleNext() {
        this.setState(() => { this.firstRowIndex += this.widget.rowsPerPage; });
        this.widget.onPageChanged?.(this.firstRowIndex);
    }

    build(context) {
        const theme = Theme.of(context);
        const cs = theme.colorScheme;
        const fg = cs.onSurface || '#1C1B1F';
        const last = Math.min(this.firstRowIndex + this.widget.rowsPerPage, this._rowCount);

        const footer = [
            new Text(`Rows per page: ${this.widget.rowsPerPage}`, { style: { fontSize: 12, color: fg } }),
            new SizedBox({ width: 32 }),
            new Text(`${this.firstRowIndex + 1}-${last} of ${this._rowCount}`, { style: { fontSize: 12, color: fg } }),
            new SizedBox({ width: 16 }),
            new IconButton({ icon: new Icon(Icons.chevronLeft, { color: fg }), onPressed: this.firstRowIndex > 0 ? () => this._handlePrev() : null }),
            new IconButton({ icon: new Icon(Icons.chevronRight, { color: fg }), onPressed: last < this._rowCount ? () => this._handleNext() : null }),
        ];

        return new Card({
            child: new Column({
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                    this.widget.header ? new Container({ padding: EdgeInsets.all(16), child: this.widget.header }) : new SizedBox(),
                    new Container({ padding: EdgeInsets.symmetric({ horizontal: 16, vertical: 8 }),
                        child: new Row({ mainAxisAlignment: MainAxisAlignment.end, children: footer }) }),
                ],
            }),
        });
    }
}

export class DataTableSource {
    constructor() { this._listeners = []; }
    get rowCount() { return 0; }
    get isRowCountApproximate() { return false; }
    get selectedRowCount() { return 0; }
    getRow(index) { return null; }
    notifyListeners() { this._listeners.forEach(l => l()); }
    addListener(l) { this._listeners.push(l); }
    removeListener(l) { const i = this._listeners.indexOf(l); if (i >= 0) this._listeners.splice(i, 1); }
}
