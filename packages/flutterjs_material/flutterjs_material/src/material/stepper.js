// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatefulWidget, State } from '../core/widget_element.js';
import { Container, BoxDecoration } from './container.js';
import { Row, Column, SizedBox } from '../widgets/widgets.js';
import { Icon, Icons } from './icon.js';
import { GestureDetector } from './gesture_detector.js';
import { Text } from './text.js';
import { TextButton } from './text_button.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { BorderRadius } from '../utils/border_radius.js';
import { MainAxisSize, CrossAxisAlignment, MainAxisAlignment } from '../utils/utils.js';
import { Theme } from './theme.js';
import { Colors } from './color.js';

/**
 * The state of a Step.
 */
export const StepState = {
    indexed: 'indexed',
    editing: 'editing',
    complete: 'complete',
    disabled: 'disabled',
    error: 'error',
};

/**
 * Defines the Stepper's main axis.
 */
export const StepperType = {
    vertical: 'vertical',
    horizontal: 'horizontal',
};

/**
 * A material step used in Stepper.
 */
export class Step {
    constructor({
        title,
        subtitle,
        content,
        state = StepState.indexed,
        isActive = false,
        label,
    } = {}) {
        this.title = title;
        this.subtitle = subtitle;
        this.content = content;
        this.state = state;
        this.isActive = isActive;
        this.label = label;
    }
}

/**
 * A material stepper widget that displays progress through a sequence of steps.
 *
 * Steppers are particularly useful in the case of forms where one step requires
 * the completion of another one, or where multiple steps need to be completed
 * in order to submit the whole form.
 */
export class Stepper extends StatefulWidget {
    constructor({
        key,
        steps = [],
        type = StepperType.vertical,
        currentStep = 0,
        onStepTapped,
        onStepContinue,
        onStepCancel,
        controlsBuilder,
        elevation,
        margin,
        connectorColor,
        connectorThickness,
    } = {}) {
        super(key);
        this.steps = steps;
        this.type = type;
        this.currentStep = currentStep;
        this.onStepTapped = onStepTapped;
        this.onStepContinue = onStepContinue;
        this.onStepCancel = onStepCancel;
        this.controlsBuilder = controlsBuilder;
        this.elevation = elevation;
        this.margin = margin;
        this.connectorColor = connectorColor;
        this.connectorThickness = connectorThickness;
    }

    createState() {
        return new StepperState();
    }
}

class StepperState extends State {
    _buildCircle(index) {
        const step = this.widget.steps[index];
        const theme = Theme.of(this._context);
        const colorScheme = theme.colorScheme;

        const isActive = step.isActive || this.widget.currentStep === index;
        const bgColor = isActive
            ? (colorScheme.primary || '#6750A4')
            : (colorScheme.onSurface ? colorScheme.onSurface + '61' : '#1C1B1F61'); // 38% opacity
        const fgColor = isActive ? (colorScheme.onPrimary || '#FFFFFF') : '#FFFFFF';

        let circleChild;
        switch (step.state) {
            case StepState.complete:
                circleChild = new Icon(Icons.check, { size: 14.0, color: fgColor });
                break;
            case StepState.editing:
                circleChild = new Icon(Icons.edit, { size: 14.0, color: fgColor });
                break;
            case StepState.error:
                circleChild = new Text('!', { style: { fontSize: 12, color: '#FFFFFF', fontWeight: 'bold' } });
                break;
            case StepState.indexed:
            case StepState.disabled:
            default:
                circleChild = new Text(`${index + 1}`, { style: { fontSize: 12, color: fgColor } });
                break;
        }

        const circleBgColor = step.state === StepState.error
            ? (colorScheme.error || '#B3261E')
            : bgColor;

        return new Container({
            width: 24,
            height: 24,
            decoration: new BoxDecoration({
                color: circleBgColor,
                borderRadius: BorderRadius.circular(12),
            }),
            alignment: 'center',
            child: circleChild,
        });
    }

    _buildConnector(isActive) {
        const theme = Theme.of(this._context);
        const colorScheme = theme.colorScheme;
        const color = this.widget.connectorColor || (isActive
            ? (colorScheme.primary || '#6750A4')
            : '#BDBDBD');
        const thickness = this.widget.connectorThickness || 1.0;

        return new Container({
            width: thickness,
            height: 16,
            decoration: new BoxDecoration({ color: color }),
        });
    }

    _buildControls(stepIndex) {
        if (this.widget.controlsBuilder) {
            return this.widget.controlsBuilder(this._context, {
                currentStep: this.widget.currentStep,
                stepIndex: stepIndex,
                onStepContinue: this.widget.onStepContinue,
                onStepCancel: this.widget.onStepCancel,
            });
        }

        return new Container({
            margin: EdgeInsets.only({ top: 16 }),
            child: new Row({
                children: [
                    new TextButton({
                        onPressed: this.widget.onStepContinue,
                        child: new Text('CONTINUE'),
                    }),
                    new SizedBox({ width: 8 }),
                    new TextButton({
                        onPressed: this.widget.onStepCancel,
                        child: new Text('CANCEL'),
                    }),
                ],
            }),
        });
    }

    _buildVerticalStep(index) {
        const step = this.widget.steps[index];
        const isCurrent = this.widget.currentStep === index;
        const isLast = index === this.widget.steps.length - 1;
        const isFirst = index === 0;

        const headerChildren = [];

        // Circle column (circle + connector lines)
        const circleColumn = new Column({
            children: [
                !isFirst ? this._buildConnector(this.widget.steps[index - 1].isActive) : new SizedBox({ height: 16 }),
                this._buildCircle(index),
                !isLast ? this._buildConnector(step.isActive) : new SizedBox({ height: 16 }),
            ],
        });

        // Title/subtitle column
        const titleColumn = new Container({
            padding: EdgeInsets.only({ left: 12 }),
            child: new Column({
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                    step.title,
                    ...(step.subtitle ? [step.subtitle] : []),
                ],
            }),
        });

        const header = new GestureDetector({
            onTap: step.state !== StepState.disabled
                ? () => this.widget.onStepTapped?.(index)
                : null,
            child: new Container({
                padding: EdgeInsets.symmetric({ horizontal: 24 }),
                child: new Row({
                    children: [circleColumn, titleColumn],
                }),
            }),
        });

        // Body (only for current step)
        const bodyChildren = [header];
        if (isCurrent) {
            bodyChildren.push(
                new Container({
                    margin: this.widget.margin || EdgeInsets.only({ left: 60, right: 24, bottom: 24 }),
                    child: new Column({
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                            step.content,
                            this._buildControls(index),
                        ],
                    }),
                })
            );
        }

        return new Column({
            crossAxisAlignment: CrossAxisAlignment.start,
            children: bodyChildren,
        });
    }

    _buildHorizontalStep(index) {
        const step = this.widget.steps[index];
        const isLast = index === this.widget.steps.length - 1;

        const stepChildren = [
            new GestureDetector({
                onTap: step.state !== StepState.disabled
                    ? () => this.widget.onStepTapped?.(index)
                    : null,
                child: new Row({
                    mainAxisSize: MainAxisSize.min,
                    children: [
                        this._buildCircle(index),
                        new SizedBox({ width: 8 }),
                        new Column({
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                                step.title,
                                ...(step.subtitle ? [step.subtitle] : []),
                            ],
                        }),
                    ],
                }),
            }),
        ];

        // Add connector line
        if (!isLast) {
            stepChildren.push(new Container({
                width: 16,
                height: this.widget.connectorThickness || 1.0,
                margin: EdgeInsets.symmetric({ horizontal: 8 }),
                decoration: new BoxDecoration({
                    color: this.widget.connectorColor || '#BDBDBD',
                }),
            }));
        }

        return new Row({
            mainAxisSize: MainAxisSize.min,
            children: stepChildren,
        });
    }

    build(context) {
        this._context = context;

        if (this.widget.type === StepperType.horizontal) {
            // Header row
            const headerChildren = this.widget.steps.map((_, index) => {
                return this._buildHorizontalStep(index);
            });

            // Current step content
            const currentStep = this.widget.steps[this.widget.currentStep];

            return new Column({
                children: [
                    new Container({
                        padding: EdgeInsets.all(24),
                        child: new Row({
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: headerChildren,
                        }),
                    }),
                    new Container({
                        padding: EdgeInsets.symmetric({ horizontal: 24 }),
                        child: currentStep.content,
                    }),
                    this._buildControls(this.widget.currentStep),
                ],
            });
        }

        // Vertical stepper
        const stepWidgets = this.widget.steps.map((_, index) => {
            return this._buildVerticalStep(index);
        });

        return new Column({
            crossAxisAlignment: CrossAxisAlignment.start,
            children: stepWidgets,
        });
    }
}
