import { StatefulWidget, State } from '../core/widget_element.js';
import { Container } from './container.js';
import { Column, Row, SizedBox } from '../widgets/widgets.js'; // Assuming GridView is not ready, use Rows/Cols
import { Text } from './text.js';
import { GestureDetector } from './gesture_detector.js';
import { Icons, Icon } from './icon.js';
import { IconButton } from './icon_button.js';
import { MainAxisAlignment, CrossAxisAlignment, MainAxisSize } from '../utils/utils.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { Theme } from './theme.js';
import { BorderRadius } from '../utils/border_radius.js';

export class CalendarDatePicker extends StatefulWidget {
    constructor({
        key,
        initialDate,
        firstDate,
        lastDate,
        currentDate,
        onDateChanged,
        onDisplayedMonthChanged,
        initialCalendarMode = 'date',
        selectableDayPredicate,
    } = {}) {
        super(key);
        this.initialDate = initialDate || new Date();
        this.firstDate = firstDate || new Date(1900, 0, 1);
        this.lastDate = lastDate || new Date(2100, 11, 31);
        this.currentDate = currentDate || new Date();
        this.onDateChanged = onDateChanged;
        this.onDisplayedMonthChanged = onDisplayedMonthChanged;
        this.initialCalendarMode = initialCalendarMode;
        this.selectableDayPredicate = selectableDayPredicate;
    }

    createState() {
        return new CalendarDatePickerState();
    }
}

class CalendarDatePickerState extends State {
    constructor() {
        super();
        this.displayedMonth = null;
        this.selectedDate = null;
    }

    initState() {
        this.displayedMonth = new Date(this.widget.initialDate.getFullYear(), this.widget.initialDate.getMonth(), 1);
        this.selectedDate = this.widget.initialDate;
    }

    _handlePreviousMonth() {
        this.setState(() => {
            this.displayedMonth = new Date(this.displayedMonth.getFullYear(), this.displayedMonth.getMonth() - 1, 1);
        });
        this.widget.onDisplayedMonthChanged?.(this.displayedMonth);
    }

    _handleNextMonth() {
        this.setState(() => {
            this.displayedMonth = new Date(this.displayedMonth.getFullYear(), this.displayedMonth.getMonth() + 1, 1);
        });
        this.widget.onDisplayedMonthChanged?.(this.displayedMonth);
    }

    _handleDayChanged(date) {
        this.setState(() => {
            this.selectedDate = date;
        });
        this.widget.onDateChanged?.(date);
    }

    build(context) {
        // Simple Calendar Grid implementation

        const year = this.displayedMonth.getFullYear();
        const month = this.displayedMonth.getMonth();

        // Month Header
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        const header = new Row({
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
                new IconButton({
                    icon: new Icon(Icons.arrowBack),
                    onPressed: () => this._handlePreviousMonth()
                }),
                new Text(`${monthNames[month]} ${year}`, {
                    style: { fontWeight: 'bold', fontSize: '16px' }
                }),
                new IconButton({
                    icon: new Icon(Icons.arrowForward),
                    onPressed: () => this._handleNextMonth()
                })
            ]
        });

        const theme = Theme.of(context);
        const colorScheme = theme.colorScheme;
        const primaryColor = colorScheme.primary || '#6750A4';
        const onPrimaryColor = colorScheme.onPrimary || '#FFFFFF';
        const onSurfaceColor = colorScheme.onSurface || '#1C1B1F';

        // Days Grid
        // Get days in month
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun

        const dayRows = [];
        let currentDay = 1;
        let currentRowChildren = [];

        // Empty slots
        for (let i = 0; i < firstDayOfWeek; i++) {
            currentRowChildren.push(new SizedBox({ width: 40, height: 40 }));
        }

        // Days
        while (currentDay <= daysInMonth) {
            const date = new Date(year, month, currentDay);
            const isSelected = this.selectedDate &&
                this.selectedDate.getFullYear() === year &&
                this.selectedDate.getMonth() === month &&
                this.selectedDate.getDate() === currentDay;

            const dayNum = currentDay; // Capture for closure

            currentRowChildren.push(new GestureDetector({
                onTap: () => this._handleDayChanged(date),
                child: new Container({
                    width: 40,
                    height: 40,
                    alignment: 'center', // shorthand for Alignment.center if supported mainly
                    decoration: isSelected ? new BoxDecoration({
                        color: primaryColor, // use theme
                        borderRadius: BorderRadius.circular(20) // should use BorderRadius object
                    }) : null,
                    child: new Center({
                        child: new Text(dayNum.toString(), {
                            style: {
                                color: isSelected ? onPrimaryColor : onSurfaceColor
                            }
                        })
                    })
                })
            }));

            if (currentRowChildren.length === 7) {
                dayRows.push(new Row({ children: currentRowChildren, mainAxisAlignment: MainAxisAlignment.spaceEvenly }));
                currentRowChildren = [];
            }

            currentDay++;
        }

        // Remaining
        if (currentRowChildren.length > 0) {
            // Fill rest
            while (currentRowChildren.length < 7) {
                currentRowChildren.push(new SizedBox({ width: 40, height: 40 }));
            }
            dayRows.push(new Row({ children: currentRowChildren, mainAxisAlignment: MainAxisAlignment.spaceEvenly }));
        }

        return new Container({
            padding: EdgeInsets.all(16.0),
            child: new Column({
                mainAxisSize: MainAxisSize.min,
                children: [
                    header,
                    new SizedBox({ height: 16 }),
                    ...dayRows
                ]
            })
        });
    }
}
