import {
    ChangeDetectionStrategy,
    Component,
    ContentChildren,
    EventEmitter,
    Input,
    Output,
    QueryList,
    SimpleChanges,
    TemplateRef,
    ViewChild,
    ViewEncapsulation,
} from '@angular/core';
import { Pager, colDef } from './modals';
import { SlotDirective } from './slot.directive';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
    selector: 'ng-datatable',
    templateUrl: './ng-datatable.html',
    styleUrls: ['./style.css'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NgDataTableComponent {
    // props
    @Input() loading: boolean = false;
    @Input() isServerMode: boolean = false;
    @Input() skin: string = 'bh-table-striped bh-table-hover';
    @Input() totalRows: number = 0;
    @Input() rows: Array<any> = [];
    @Input() columns: Array<colDef> = [];
    @Input() hasCheckbox: boolean = false;
    @Input() search: string = '';
    @Input() page: number = 1;
    @Input() pageSize: number = 10;
    @Input() pageSizeOptions: Array<number> = [10, 20, 30, 50, 100];
    @Input() showPageSize: boolean = true;
    @Input() rowClass: string | Function = '';
    @Input() cellClass: string | Function = '';
    @Input() sortable: boolean = false;
    @Input() sortColumn: string = 'id';
    @Input() sortDirection: string = 'asc';
    @Input() columnFilter: boolean = false;
    @Input() pagination: boolean = true;
    @Input() showNumbers: boolean = true;
    @Input() showNumbersCount: number = 5;
    @Input() showFirstPage: boolean = true;
    @Input() showLastPage: boolean = true;
    @Input() firstArrow: string = '';
    @Input() lastArrow: string = '';
    @Input() nextArrow: string = '';
    @Input() previousArrow: string = '';
    @Input() paginationInfo: string = 'Mostrando {0} al {1} de {2} entradas';
    @Input() noDataContent: string = 'No hay datos disponibles';
    @Input() stickyHeader: boolean = false;
    @Input() height: string = '500px';
    @Input() stickyFirstColumn: boolean = false;
    @Input() cloneHeaderInFooter: boolean = false;
    @Input() selectRowOnClick: boolean = false;

    // events
    @Output() changeServer = new EventEmitter<any>();
    @Output() sortChange = new EventEmitter<any>();
    @Output() searchChange = new EventEmitter<any>();
    @Output() pageChange = new EventEmitter<any>();
    @Output() pageSizeChange = new EventEmitter<any>();
    @Output() rowSelect = new EventEmitter<any>();
    @Output() filterChange = new EventEmitter<any>();
    @Output() rowClick = new EventEmitter<any>();
    @Output() rowDBClick = new EventEmitter<any>();

    // variables
    filterItems: Array<any> = [];
    currentPage = this.page;
    currentPageSize = this.pagination ? this.pageSize : this.rows.length;
    oldPageSize = this.pageSize;
    currentSortColumn = this.sortColumn;
    oldSortColumn = this.sortColumn;
    currentSortDirection = this.sortDirection;
    oldSortDirection = this.sortDirection;
    filterRowCount = this.totalRows;

    selectedAll: any = null;
    currentLoader = this.loading;
    currentSearch = this.search;
    oldColumns: colDef[];
    uniqueKey: string = '';

    constructor(private sanitizer: DomSanitizer) {}
    ngOnInit() {
        this.initDeafultValues();
        this.changeRows();
    }
    ngOnChanges(changes: SimpleChanges) {
        // watch loading
        if (changes['loading'] && !changes['loading'].firstChange) {
            this.currentLoader = this.loading;
        }

        // watch rows and columns
        if ((changes['rows'] && !changes['rows'].firstChange) || (changes['columns'] && !changes['columns'].firstChange)) {
            if (!this.isServerMode) {
                this.currentPage = 1;
                this.oldColumns = this.noReact(this.columns);
            }
            this.changeRows();
        }

        // watch page
        if (!this.isServerMode) {
            if (changes['page'] && !changes['page'].firstChange) {
                this.movePage(this.page);
            }
        }

        // watch pagesize
        if (changes['pageSize'] && !changes['pageSize'].firstChange) {
            this.currentPageSize = this.pagination ? this.pageSize : this.rows.length;
            if (!this.isServerMode) {
                this.changePageSize();
            }
        }

        // watch search
        if (changes['search'] && !changes['search'].firstChange) {
            this.currentSearch = this.search;
            this.changeSearch();
        }

        // watch sort column and direction
        if (!this.isServerMode) {
            if ((changes['sortColumn'] && !changes['sortColumn'].firstChange) || (changes['sortDirection'] && !changes['sortDirection'].firstChange)) {
                this.sortChangeMethod(this.sortColumn, this.sortDirection);
            }
        }
    }

    initDeafultValues() {
        this.currentLoader = this.loading;
        this.currentSearch = this.search;
        this.currentSortColumn = this.sortColumn;
        this.currentSortDirection = this.sortDirection;
        this.filterRowCount = this.totalRows;

        this.currentPage = this.page;
        if (this.pagination) {
            const exists = this.pageSizeOptions.find((d) => d === this.pageSize);
            this.currentPageSize = exists ? this.pageSize : 10;
        } else {
            this.currentPageSize = this.rows.length;
        }

        this.oldPageSize = this.pageSize;
        this.oldSortColumn = this.sortColumn;
        this.oldSortDirection = this.sortDirection;

        // set default columns values
        for (const item of this.columns || []) {
            const type = item.type?.toLowerCase() || 'string';
            item.type = type;
            item.isUnique = item.isUnique !== undefined ? item.isUnique : false;
            item.hide = item.hide !== undefined ? item.hide : false;
            item.filter = item.filter !== undefined ? item.filter : true;
            item.search = item.search !== undefined ? item.search : true;
            item.sort = item.sort !== undefined ? item.sort : true;
            item.html = item.html !== undefined ? item.html : false;
            item.condition = !type || type === 'string' ? 'contain' : 'equal';
        }

        this.oldColumns = this.noReact(this.columns);

        this.setUniqueKey();
    }
    props: any;
    get getProps() {
        return {
            loading: this.currentLoader,
            isServerMode: this.isServerMode,
            skin: this.skin,
            totalRows: this.filterRowCount,
            rows: this.rows,
            columns: this.columns,
            hasCheckbox: this.hasCheckbox,
            search: this.currentSearch,
            page: this.currentPage,
            pageSize: this.currentPageSize,
            pageSizeOptions: this.pageSizeOptions,
            showPageSize: this.showPageSize,
            rowClass: this.rowClass,
            cellClass: this.cellClass,
            sortable: this.sortable,
            sortColumn: this.currentSortColumn,
            sortDirection: this.currentSortDirection,
            columnFilter: this.columnFilter,
            pagination: this.pagination,
            showNumbers: this.showNumbers,
            showNumbersCount: this.showNumbersCount,
            showFirstPage: this.showFirstPage,
            showLastPage: this.showLastPage,
            firstArrow: this.firstArrow,
            lastArrow: this.lastArrow,
            nextArrow: this.nextArrow,
            previousArrow: this.previousArrow,
            paginationInfo: this.paginationInfo,
            noDataContent: this.noDataContent,
            stickyHeader: this.stickyHeader,
            height: this.height,
            stickyFirstColumn: this.stickyFirstColumn,
            cloneHeaderInFooter: this.cloneHeaderInFooter,
            selectRowOnClick: this.selectRowOnClick,
        };
    }

    isFunction(value: any): value is Function {
        return typeof value === 'function';
    }

    stringFormat() {
        const args: any[] = [this.filterRowCount ? this.offset() : 0, this.limit(), this.filterRowCount];
        return this.paginationInfo.replace(/{(\d+)}/g, (match, number) => {
            return typeof args[number] != 'undefined' ? args[number] : match;
        });
    }
    setUniqueKey() {
        const col = this.columns.find((d) => d.isUnique);
        this.uniqueKey = col?.field || '';
    }

    maxPage() {
        const totalPages = this.currentPageSize < 1 ? 1 : Math.ceil(this.filterRowCount / this.currentPageSize);
        return Math.max(totalPages || 0, 1);
    }
    offset() {
        return (this.currentPage - 1) * this.currentPageSize + 1;
    }
    limit() {
        const limit = this.currentPage * this.currentPageSize;
        return this.filterRowCount >= limit ? limit : this.filterRowCount;
    }

    pager: Pager = new Pager();
    getPager() {
        // total pages
        let totalPages = this.maxPage();

        // pages
        let startPage: number, endPage: number;
        let isMaxSized = typeof this.showNumbersCount !== 'undefined' && this.showNumbersCount < totalPages;
        // recompute if maxSize
        if (isMaxSized) {
            // Current page is displayed in the middle of the visible ones
            startPage = Math.max(this.currentPage - Math.floor(this.showNumbersCount / 2), 1);
            endPage = startPage + this.showNumbersCount - 1;

            // Adjust if limit is exceeded
            if (endPage > totalPages) {
                endPage = totalPages;
                startPage = endPage - this.showNumbersCount + 1;
            }
        } else {
            startPage = 1;
            endPage = totalPages;
        }

        const pages = Array.from(Array(endPage + 1 - startPage).keys()).map((i) => startPage + i);

        return <Pager>{
            totalRows: this.isServerMode ? this.totalRows : this.filterItems.length,
            currentPage: this.currentPage,
            pageSize: this.pageSize,
            maxPage: totalPages,
            startPage: startPage,
            endPage: endPage,
            stringFormat: this.stringFormat(),
            pages: pages,
        };
    }
    setPager() {
        this.pager = this.getPager();
    }

    filterRows() {
        let result = [];
        let rows = this.rows || [];

        if (this.isServerMode) {
            this.filterRowCount = this.totalRows || 0;
            result = rows;
        } else {
            this.columns?.forEach((d) => {
                if (d.filter && ((d.value !== undefined && d.value !== null && d.value !== '') || d.condition === 'is_null' || d.condition === 'is_not_null')) {
                    // string filters
                    if (d.type === 'string') {
                        if (d.value && !d.condition) {
                            d.condition = 'contain';
                        }

                        if (d.condition === 'contain') {
                            rows = rows.filter((item) => {
                                return this.cellValue(item, d.field)?.toString().toLowerCase().includes(d.value.toLowerCase());
                            });
                        } else if (d.condition === 'not_contain') {
                            rows = rows.filter((item) => {
                                return !this.cellValue(item, d.field)?.toString().toLowerCase().includes(d.value.toLowerCase());
                            });
                        } else if (d.condition === 'equal') {
                            rows = rows.filter((item) => {
                                return this.cellValue(item, d.field)?.toString().toLowerCase() === d.value.toLowerCase();
                            });
                        } else if (d.condition === 'not_equal') {
                            rows = rows.filter((item) => {
                                return this.cellValue(item, d.field)?.toString().toLowerCase() !== d.value.toLowerCase();
                            });
                        } else if (d.condition === 'start_with') {
                            rows = rows.filter((item) => {
                                return this.cellValue(item, d.field)?.toString().toLowerCase().indexOf(d.value.toLowerCase()) === 0;
                            });
                        } else if (d.condition === 'end_with') {
                            rows = rows.filter((item) => {
                                return (
                                    this.cellValue(item, d.field)
                                        ?.toString()
                                        .toLowerCase()
                                        .substr(d.value.length * -1) === d.value.toLowerCase()
                                );
                            });
                        }
                    }

                    // number filters
                    else if (d.type === 'number') {
                        if (d.value && !d.condition) {
                            d.condition = 'equal';
                        }

                        if (d.condition === 'equal') {
                            rows = rows.filter((item) => {
                                return this.cellValue(item, d.field) && parseFloat(this.cellValue(item, d.field)) === parseFloat(d.value);
                            });
                        } else if (d.condition === 'not_equal') {
                            rows = rows.filter((item) => {
                                return this.cellValue(item, d.field) && parseFloat(this.cellValue(item, d.field)) !== parseFloat(d.value);
                            });
                        } else if (d.condition === 'greater_than') {
                            rows = rows.filter((item) => {
                                return this.cellValue(item, d.field) && parseFloat(this.cellValue(item, d.field)) > parseFloat(d.value);
                            });
                        } else if (d.condition === 'greater_than_equal') {
                            rows = rows.filter((item) => {
                                return this.cellValue(item, d.field) && parseFloat(this.cellValue(item, d.field)) >= parseFloat(d.value);
                            });
                        } else if (d.condition === 'less_than') {
                            rows = rows.filter((item) => {
                                return this.cellValue(item, d.field) && parseFloat(this.cellValue(item, d.field)) < parseFloat(d.value);
                            });
                        } else if (d.condition === 'less_than_equal') {
                            rows = rows.filter((item) => {
                                return this.cellValue(item, d.field) && parseFloat(this.cellValue(item, d.field)) <= parseFloat(d.value);
                            });
                        }
                    }

                    // date filters
                    if (d.type === 'date') {
                        if (d.value && !d.condition) {
                            d.condition = 'equal';
                        }

                        if (d.condition === 'equal') {
                            rows = rows.filter((item: any) => {
                                return this.cellValue(item, d.field) && this.dateFormat(this.cellValue(item, d.field)) === d.value;
                            });
                        } else if (d.condition === 'not_equal') {
                            rows = rows.filter((item: any) => {
                                return this.cellValue(item, d.field) && this.dateFormat(this.cellValue(item, d.field)) !== d.value;
                            });
                        } else if (d.condition === 'greater_than') {
                            rows = rows.filter((item: any) => {
                                return this.cellValue(item, d.field) && this.dateFormat(this.cellValue(item, d.field)) > d.value;
                            });
                        } else if (d.condition === 'less_than') {
                            rows = rows.filter((item: any) => {
                                return this.cellValue(item, d.field) && this.dateFormat(this.cellValue(item, d.field)) < d.value;
                            });
                        }
                    }

                    // boolean filters
                    else if (d.type === 'bool') {
                        rows = rows.filter((item: any) => {
                            return this.cellValue(item, d.field) === d.value;
                        });
                    }

                    if (d.condition === 'is_null') {
                        rows = rows.filter((item: any) => {
                            return this.cellValue(item, d.field) == null || this.cellValue(item, d.field) === '';
                        });
                        d.value = '';
                    } else if (d.condition === 'is_not_null') {
                        d.value = '';
                        rows = rows.filter((item: any) => {
                            return this.cellValue(item, d.field);
                        });
                    }
                }
            });

            if (this.currentSearch && rows.length) {
                let final: Array<any> = [];

                const keys = (this.columns || [])
                    .filter((d: any) => d.search && !d.hide)
                    .map((d: any) => {
                        return d.field;
                    });

                for (let j = 0; j < rows.length; j++) {
                    for (let i = 0; i < keys.length; i++) {
                        if (this.cellValue(rows[j], keys[i])?.toString().toLowerCase().includes(this.currentSearch.toLowerCase())) {
                            final.push(rows[j]);
                            break;
                        }
                    }
                }

                rows = final;
            }

            // sort rows
            const collator = new Intl.Collator(undefined, {
                numeric: true,
                sensitivity: 'base',
            });
            const sortOrder = this.currentSortDirection === 'desc' ? -1 : 1;

            rows.sort((a: any, b: any): number => {
                const valA = this.currentSortColumn?.split('.').reduce((obj, key) => obj?.[key], a);
                const valB = this.currentSortColumn?.split('.').reduce((obj, key) => obj?.[key], b);

                return collator.compare(valA, valB) * sortOrder;
            });

            this.filterRowCount = rows.length || 0;
            result = rows.slice(this.offset() - 1, <number>this.limit());
        }

        this.filterItems = result || [];

        this.setPager();
    }

    // page change
    movePage(page: number = 1) {
        if (this.currentLoader || page < 1 || page > this.maxPage()) {
            return;
        }
        this.currentPage = page;
        this.clearSelectedRows();

        if (this.isServerMode) {
            this.changeForServer('page');
        } else {
            this.filterRows();
            this.pageChange.emit(this.currentPage);
        }
    }

    // row update
    changeRows() {
        this.clearSelectedRows();
        this.filterRows();
    }

    // pagesize changed
    changePageSize() {
        this.currentPage = 1;

        this.clearSelectedRows();

        if (this.isServerMode) {
            this.changeForServer('pagesize', true);
        } else {
            this.filterRows();
            this.pageSizeChange.emit(this.currentPageSize);
        }
    }

    // sorting
    sortChangeMethod(field: string, dir = '') {
        let direction = dir || 'asc';
        if (field === this.currentSortColumn) {
            if (this.currentSortDirection === 'asc') {
                direction = 'desc';
            }
        }
        const offset = (this.currentPage - 1) * this.currentPageSize;
        const limit = this.currentPageSize;
        this.currentSortColumn = field;
        this.currentSortDirection = direction;

        this.clearSelectedRows();

        if (this.isServerMode) {
            this.changeForServer('sort');
        } else {
            this.filterRows();
            this.sortChange.emit({ offset, limit, field, direction });
        }
    }

    // checkboax
    @ViewChild('header1') header1: any;
    @ViewChild('header2') header2: any;
    checkboxChange() {
        this.checkIfAllSelected();
        const rows = this.getSelectedRows();
        this.rowSelect.emit(rows);
    }

    selectAll(checked: any, isAll = false) {
        this.filterItems.map((d: any) => (d.selected = checked));
        if (isAll) {
            this.checkboxChange();
        } else {
            this.checkIfAllSelected();
        }
    }
    checkIfAllSelected() {
        const cnt = this.filterItems.filter((d) => d.selected);
        this.selectedAll = cnt.length && cnt.length === this.filterItems.length;

        setTimeout(() => {
            this.header1?.checkboxChange();
            if (this.cloneHeaderInFooter) {
                this.header2?.checkboxChange();
            }
        });
    }

    // columns filter
    filterChangeMethod() {
        this.currentPage = 1;
        this.clearSelectedRows();

        if (this.isServerMode) {
            this.changeForServer('filter', true);
        } else {
            this.filterRows();
            this.filterChange.emit(this.columns);
        }
    }

    // search
    changeSearch() {
        this.currentPage = 1;
        this.clearSelectedRows();

        if (this.isServerMode) {
            this.changeForServer('search', true);
        } else {
            this.filterRows();
            this.searchChange.emit(this.currentSearch);
        }
    }

    cellValue(item: any, field: string = '') {
        return field?.split('.').reduce((obj, key) => obj?.[key], item);
    }

    dateFormat(date: any) {
        try {
            if (!date) {
                return '';
            }
            const dt = new Date(date);
            const day = dt.getDate();
            const month = dt.getMonth() + 1;
            const year = dt.getFullYear();

            return year + '-' + (month > 9 ? month : '0' + month) + '-' + (day > 9 ? day : '0' + day);
        } catch {}
        return '';
    }

    //row click
    timer: any = null;
    delay: number = 230;
    onRowClick(item: any, index: number) {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
            if (this.selectRowOnClick) {
                if (this.isRowSelected(index)) {
                    this.unselectRow(index);
                } else {
                    this.selectRow(index);
                }

                this.checkboxChange();
            }
            this.rowClick.emit(item);
        }, this.delay);
    }

    onRowDoubleClick(item: any) {
        clearTimeout(this.timer);
        this.rowDBClick.emit(item);
    }

    // emit change event for server side pagination
    changeForServer(changeType: string, isResetPage = false) {
        if (this.isServerMode) {
            if (changeType === 'page') {
                this.setPager();
            }

            this.setDefaultCondition();

            const res = {
                current_page: Number(isResetPage ? 1 : this.currentPage),
                pagesize: Number(this.currentPageSize),
                offset: Number((this.currentPage - 1) * <number>this.currentPageSize),
                sort_column: this.currentSortColumn,
                sort_direction: this.currentSortDirection,
                search: this.currentSearch,
                column_filters: this.columns,
                change_type: changeType,
            };
            this.changeServer.emit(res);
        }
    }

    // set default conditions when values exists and condition empty
    setDefaultCondition() {
        for (let i = 0; i < this.columns.length; i++) {
            let d = this.columns[i];

            if (d.filter && ((d.value !== undefined && d.value !== null && d.value !== '') || d.condition === 'is_null' || d.condition === 'is_not_null')) {
                if (d.type === 'string' && d.value && !d.condition) {
                    d.condition = 'contain';
                }
                if (d.type === 'number' && d.value && !d.condition) {
                    d.condition = 'equal';
                }
                if (d.type === 'date' && d.value && !d.condition) {
                    d.condition = 'equal';
                }
            }
        }
    }

    // methods
    reset() {
        this.columns = this.noReact(this.oldColumns);
        this.currentSearch = '';
        this.currentPage = 1;
        this.currentPageSize = this.oldPageSize;
        this.currentSortColumn = this.oldSortColumn;
        this.currentSortDirection = this.oldSortDirection;

        this.clearSelectedRows();

        if (this.isServerMode) {
            this.changeForServer('reset', true);
        } else {
            this.filterRows();
        }
    }
    getSelectedRows() {
        return this.filterItems.filter((d) => d.selected);
    }
    getColumnFilters() {
        return this.columns;
    }
    clearSelectedRows() {
        if (this.filterItems) {
            this.selectAll(false);
        }
    }
    selectRow(index: number) {
        if (!this.isRowSelected(index)) {
            const rows = this.filterItems.find((d: any, i: number) => i === index);
            if (rows) {
                rows.selected = true;
            }
        }
    }
    unselectRow(index: number) {
        if (this.isRowSelected(index)) {
            const rows = this.filterItems.find((d: any, i: number) => i === index);
            rows.selected = false;
        }
    }
    isRowSelected(index: number): boolean {
        const rows = this.filterItems.find((d: any, i: number) => i === index);
        if (rows) {
            return rows.selected;
        }
        return false;
    }

    // trackby
    trackFilterItems(index: number, item: any) {
        return this.uniqueKey ? item[this.uniqueKey] : (this.currentPage - 1) * this.pageSize + index;
    }

    // slots
    @ContentChildren(SlotDirective) slots: QueryList<SlotDirective>;
    @ViewChild('defaultTemplate', { static: true }) defaultTemplate: TemplateRef<any>;
    slotsMap: Map<string, TemplateRef<any>> = new Map<string, TemplateRef<any>>();

    ngAfterContentInit() {
        this.slots.forEach((template) => {
            const fieldName = template.fieldName;
            if (fieldName) {
                this.slotsMap.set(fieldName, template.templateRef);
            }
        });
    }
    hasSlot(fieldName: string = ''): boolean {
        return this.slotsMap.has(fieldName);
    }
    getSlot(fieldName: string = ''): TemplateRef<any> {
        return this.slotsMap.get(fieldName) || this.defaultTemplate;
    }

    // Sanitize and trust the HTML content
    sanitizeHtml(html: string): SafeHtml {
        return this.sanitizer.bypassSecurityTrustHtml(html);
    }

    noReact(value: any) {
        return JSON.parse(JSON.stringify(value));
    }

    getRange(size: number): number[] {
        return Array.from({ length: size }, (_, index) => index + 1);
    }
}
