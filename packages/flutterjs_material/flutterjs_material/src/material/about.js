import { StatelessWidget } from '../core/widget_element.js';
import { AlertDialog } from './alert_dialog.js';
import { ListTile } from './list_tile.js';
import { showDialog } from './dialog.js';
import { Icon, Icons } from './icon.js';
import { Text } from './text.js';
import { GestureDetector } from './gesture_detector.js';
import { Column, SizedBox } from '../widgets/widgets.js';
import { SingleChildScrollView } from './single_child_scroll_view.js';
import { MainAxisSize, CrossAxisAlignment, Alignment } from '../utils/utils.js';
import { Theme } from './theme.js';

class AboutDialog extends StatelessWidget {
    constructor({
        key,
        applicationName,
        applicationVersion,
        applicationIcon,
        applicationLegalese,
        children
    } = {}) {
        super(key);
        this.applicationName = applicationName;
        this.applicationVersion = applicationVersion;
        this.applicationIcon = applicationIcon;
        this.applicationLegalese = applicationLegalese;
        this.children = children;
    }

    build(context) {
        const name = this.applicationName || 'Application';
        const version = this.applicationVersion;
        const icon = this.applicationIcon;
        const legalese = this.applicationLegalese;
        const children = this.children || [];

        const theme = Theme.of(context);
        const colorScheme = theme.colorScheme;
        const primaryColor = colorScheme.primary || '#6750A4';
        const onSurfaceVariant = colorScheme.onSurfaceVariant || '#49454E';

        let body = [];

        if (legalese) {
            body.push(new Text(legalese, {
                style: {
                    fontSize: '12px',
                    color: onSurfaceVariant
                }
            }));
            body.push(new SizedBox({ height: 18 }));
        }

        if (children.length > 0) {
            body.push(...children);
        }

        return new AlertDialog({
            content: new SingleChildScrollView({
                child: new Column({
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                        new Column({
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                                icon ? new SizedBox({
                                    width: 48,
                                    height: 48,
                                    child: icon
                                }) : new SizedBox(),
                                icon ? new SizedBox({ height: 24 }) : new SizedBox(),
                                new Text(name, {
                                    style: {
                                        fontSize: '24px',
                                        fontWeight: '500' // Headline 5-ish
                                    }
                                }),
                                version ? new Text(version, {
                                    style: {
                                        fontSize: '12px',
                                        color: onSurfaceVariant
                                    }
                                }) : new SizedBox(),
                                new SizedBox({ height: 18 }),
                            ]
                        }),
                        ...body
                    ]
                })
            }),
            actions: [
                // Minimal implementation using GestureDetector since TextButton might not be ready
                new GestureDetector({
                    onTap: () => { /* License page placeholder */ },
                    child: new Text('VIEW LICENSES', {
                        style: { color: primaryColor, cursor: 'pointer', fontWeight: '500', padding: '8px' }
                    })
                }),
                new GestureDetector({
                    onTap: () => {
                        if (window.__closeCurrentDialog) window.__closeCurrentDialog();
                    },
                    child: new Text('CLOSE', {
                        style: { color: primaryColor, cursor: 'pointer', fontWeight: '500', padding: '8px' }
                    })
                })
            ]
        });
    }
}

function showAboutDialog({
    context,
    applicationName,
    applicationVersion,
    applicationIcon,
    applicationLegalese,
    children,
    routeSettings,
    useRootNavigator = true,
} = {}) {
    showDialog({
        context: context,
        useRootNavigator: useRootNavigator,
        builder: (context) => {
            return new AboutDialog({
                applicationName: applicationName,
                applicationVersion: applicationVersion,
                applicationIcon: applicationIcon,
                applicationLegalese: applicationLegalese,
                children: children
            });
        },
    });
}

class AboutListTile extends StatelessWidget {
    constructor({
        key,
        icon,
        child,
        applicationName,
        applicationVersion,
        applicationIcon,
        applicationLegalese,
        aboutBoxChildren,
        dense,
    } = {}) {
        super(key);
        this.icon = icon;
        this.child = child;
        this.applicationName = applicationName;
        this.applicationVersion = applicationVersion;
        this.applicationIcon = applicationIcon;
        this.applicationLegalese = applicationLegalese;
        this.aboutBoxChildren = aboutBoxChildren;
        this.dense = dense;
    }

    build(context) {
        return new ListTile({
            leading: this.icon || new Icon(Icons.info),
            title: this.child || new Text('About'),
            dense: this.dense,
            onTap: () => {
                showAboutDialog({
                    context: context,
                    applicationName: this.applicationName,
                    applicationVersion: this.applicationVersion,
                    applicationIcon: this.applicationIcon,
                    applicationLegalese: this.applicationLegalese,
                    children: this.aboutBoxChildren,
                });
            }
        });
    }
}

export {
    AboutDialog,
    showAboutDialog,
    AboutListTile
};
