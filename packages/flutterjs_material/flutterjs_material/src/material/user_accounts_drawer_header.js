import { StatefulWidget, State } from '../core/widget_element.js';
import { Column, Row, Expanded } from '../widgets/widgets.js';
import { DrawerHeader } from './drawer_header.js';
import { Container } from './container.js';
import { Theme } from './theme.js';
import { Colors } from './color.js';
import { EdgeInsets } from '../utils/edge_insets.js';

export class UserAccountsDrawerHeader extends StatefulWidget {
    constructor({
        key,
        decoration,
        margin = EdgeInsets.only({ bottom: 8.0 }),
        currentAccountPicture,
        otherAccountsPictures = [],
        currentAccountPictureSize = 72.0, // Size { width: 72, height: 72 }
        otherAccountsPicturesSize = 40.0, // Size { width: 40, height: 40 }
        accountName,
        accountEmail,
        onDetailsPressed,
        arrowColor, // Defaults handled in build
    } = {}) {
        super(key);
        this.decoration = decoration;
        this.margin = margin;
        this.currentAccountPicture = currentAccountPicture;
        this.otherAccountsPictures = otherAccountsPictures;
        this.currentAccountPictureSize = currentAccountPictureSize;
        this.otherAccountsPicturesSize = otherAccountsPicturesSize;
        this.accountName = accountName;
        this.accountEmail = accountEmail;
        this.onDetailsPressed = onDetailsPressed;
        this.arrowColor = arrowColor;
    }

    createState() {
        return new UserAccountsDrawerHeaderState();
    }
}

class UserAccountsDrawerHeaderState extends State {
    build(context) {
        return new DrawerHeader({
            decoration: this.widget.decoration,
            margin: this.widget.margin,
            padding: EdgeInsets.zero(), // We manually handle padding inside
            child: new Container({
                padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: new Column({
                    crossAxisAlignment: 'start', // CrossAxisAlignment.start
                    children: [
                        new Row({
                            children: [
                                // Current Picture
                                new Container({
                                    width: this.widget.currentAccountPictureSize,
                                    height: this.widget.currentAccountPictureSize,
                                    child: this.widget.currentAccountPicture
                                }),
                                // Expanded space
                                new Expanded({ child: new Container() }),
                                // Other pictures
                                ...this.widget.otherAccountsPictures.map(pic => new Container({
                                    width: this.widget.otherAccountsPicturesSize,
                                    height: this.widget.otherAccountsPicturesSize,
                                    margin: EdgeInsets.only({ left: 16 }),
                                    child: pic
                                }))
                            ]
                        }),
                        new Expanded({ child: new Container() }), // Spacer
                        new Container({
                            child: new Column({
                                crossAxisAlignment: 'start',
                                children: [
                                    this.widget.accountName,
                                    this.widget.accountEmail
                                ].filter(Boolean)
                            })
                        })
                        // If onDetailsPressed, add drop arrow row
                    ]
                })
            })
        });
    }
}
