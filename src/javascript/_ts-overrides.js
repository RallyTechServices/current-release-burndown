   Ext.define('Rally.app.TimeboxScopedApp', {
        extend: 'Rally.app.App',
        requires: [
            'Rally.ui.gridboard.TimeboxBlankSlate',
            'Rally.ui.combobox.IterationComboBox',
            'Rally.ui.combobox.ReleaseComboBox',
            'Rally.app.TimeboxScope'
        ],
        items: [
            {
                xtype: 'container',
                cls: 'header'
            }
        ],

        /**
         * @cfg {String}
         * Type of scope. Supported types are 'iteration' or 'release'.
         */
        scopeType: null,

        /**
         * @cfg {String}
         * The message to display when no scope objects are found.
         */
        noScopeMsg: null,

        /**
         * @cfg {String}
         * The message to use for the link to create a new scope object.
         */
        createScopeMsg: null,

        /**
         * @cfg {Object}
         * Additional config to pass to the combobox
         */
        comboboxConfig: null,

        useTimeboxScope: true,

        /**
         * @cfg {Boolean}
         * Whether or not this app is compatible with unscheduled work
         */
        supportsUnscheduled: true,

        /**
         * @override
         * @inheritdoc
         */
        launch: function() {
            var context = this.getContext();
            if (context.getTimeboxScope() && context.getTimeboxScope().getType() === this.scopeType) {
                this.onScopedDashboard = true;
                this.getHeader().hide();
                this.onTimeboxScopeChange(context.getTimeboxScope());
            } else {
                this.onScopedDashboard = false;
                this._addScopeComboBox();
            }
        },

        isOnScopedDashboard: function() {
            return this.onScopedDashboard;
        },

        /**
         * Called when any timebox scope change is received.
         * @protected
         * @param {Rally.app.TimeboxScope} timeboxScope The new scope
         */
        onTimeboxScopeChange: function(timeboxScope) {
            if(timeboxScope && timeboxScope.getType() === this.scopeType) {
                this.callParent(arguments);

                if(this.down('#unscheduledBlankSlate')) {
                    this.remove(this.down('#unscheduledBlankSlate'));
                }
                if(timeboxScope.getRecord() !== null || this.supportsUnscheduled) {
                    this.onScopeChange(timeboxScope);
                } else {
                    this._addUnscheduledBlankSlate();
                }
            }
        },

        /**
         * Called when a timebox scope change of the current scope type is received
         * @template
         * @param {Rally.app.TimeboxScope} scope The new scope
         */
        onScopeChange: function(scope) {},

        /**
         * Called when there are no timebox items to display
         * @template
         */
        onNoAvailableTimeboxes: function() {},

        getHeader: function() {
            return this.down('container[cls=header]');
        },

        isShowingBlankSlate: function() {
            return this.down('#blankSlate') !== null;
        },

        _addScopeComboBox: function() {
            var xtype = 'rally' + this.scopeType + 'combobox';

            var defaultComboBoxConfig = {
                xtype: xtype,
                stateful: true,
                stateId: this.getAppId() + 'scoping',
                storeConfig: {
                    context: {
                        project: Rally.util.Ref.getRelativeUri(this.getContext().getDataContext().project),
                        workspace: Rally.util.Ref.getRelativeUri(this.getContext().getDataContext().workspace)
                    }
                },
                plugins: [
                    {
                        ptype: 'rallycomboboxrealtimeupdate',
                        realtimeContext: this.getContext()
                    }
                ],
                listeners: {
                    ready: this._onScopeComboBoxReady,
                    select: this._onScopeComboBoxChange,
                    scope: this
                },
                allowNoEntry: this.supportsUnscheduled
            };

            this.getHeader().add(Ext.merge(defaultComboBoxConfig, this.comboboxConfig));
        },

        _onScopeComboBoxChange: function(comboBox) {
            this._changeScope(comboBox);
        },

        _onScopeComboBoxReady: function(comboBox) {
            var noTimeboxesCount = comboBox.allowNoEntry ? 1 : 0;
            if (comboBox.getStore().getCount() > noTimeboxesCount) {
                this._changeScope(comboBox);
            } else {
                this._addBlankSlate();
            }
        },

        /**
         * Changes the scope in the context
         * @param comboBox The Scope combo box
         * @private
         */
        _changeScope: function(comboBox) {
            var wasShowingBlankSlate = this.isShowingBlankSlate();
            if (wasShowingBlankSlate) {
                this._removeBlankSlate();
            }
            this.getContext().setTimeboxScope(Ext.create('Rally.app.TimeboxScope', {
                record: comboBox.getRecord(),
                type: this.scopeType
            }));
            this.onTimeboxScopeChange(this.getContext().getTimeboxScope());
        },

        _removeBlankSlate: function() {
            this.remove(this.down('#blankSlate'));
        },

        _addBlankSlate: function() {
            this.add({
                itemId: 'blankSlate',
                xtype: 'rallytimeboxblankslate',
                timeboxType: this.scopeType,
                context: this.getContext()
            });
            this.onNoAvailableTimeboxes();
        },

        _addUnscheduledBlankSlate: function() {
            this.add({
                itemId: 'unscheduledBlankSlate',
                xtype: 'container',
                cls: 'no-data-container',
                items: [
                    {
                        xtype: 'component',
                        cls: 'primary-message',
                        tpl: 'No {scopeType} selected.',
                        data: {scopeType: this.scopeType}
                    },
                    {
                        xtype: 'component',
                        cls: 'secondary-message',
                        tpl: 'Select {timebox} above to view {appName}.',
                        data: {
                            timebox: this.scopeType === 'iteration' ? 'an iteration' : 'a release',
                            appName: this.appName
                        }
                    }
                ]
            });
            this.onNoAvailableTimeboxes();
        }
    });