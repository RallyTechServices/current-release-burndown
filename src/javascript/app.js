//Ext.define('CustomApp', {
//    extend: 'Rally.app.TimeboxScopedApp',
//    scopeType: 'release',
//    logger: new Rally.technicalservices.Logger(),
//
//    onScopeChange: function(scope) {
//        this.logger.log('onScopeChange', scope);
//        
//        var filters = scope.getQueryFilter();
//        filters = filters.or(Ext.create('Rally.data.wsapi.Filter', {
//            property: "DirectChildrenCount",
//            value: 0
//        }));
//
//        Ext.create('Rally.data.wsapi.Store',{
//            model: 'HierarchicalRequirement',
//            fetch: 'ObjectID',
//            autoLoad: true, 
//            filters: [scope.getQueryFilter()],
//            limit: 'Infinity',
//            listeners: {
//                scope: this,
//                load: this._onReleaseArtifactsLoaded
//            }
//        });
//    },
//    _onReleaseArtifactsLoaded: function(store, records, success){
//        this.logger.log('_onReleaseArtifactsLoaded', success, store.getTotalCount(), records);
//        var objectIds = _.map(records, function(rec){return rec.get('ObjectID')});
//        var chartConfig = this._getChartConfig(objectIds);
//        chartConfig = this._addDateBoundsToCalculator(chartConfig);
//        chartConfig.title = this._buildChartTitle();
//        chartConfig.yAxis = this._buildYAxisConfig();
//        this.add(chartConfig);
//        
//    },
//    _getChartConfig: function(objectIds){
//        return {
//            xtype: "rallychart",
//            itemId: "burndownchart",
//
//            aggregationErrorMessage: "No data to display. Check the data type setting for displaying data based on count versus plan estimate.",
//
//            storeType: "Rally.data.lookback.SnapshotStore",
//            storeConfig: {
//                find: {
//                    "ObjectID": {$in: objectIds}
//                },
//                fetch: ["ScheduleState", "PlanEstimate", "ObjectId", "_ValidFrom", "_ValidTo"],
//                hydrate: ["ScheduleState"],
//                sort: {
//                    "_ValidFrom": 1
//                },
//                compress: true,
//                useHttpPost: true
//            },
//
//            calculatorType: "BurnDownCalculator",
//            calculatorConfig: {
//                timeZone: "GMT",
//                completedScheduleStateNames: ["Accepted", "Released"],
//                enableProjections: true
//            },
//
//            chartColors: ["#005eb8", "#8dc63f", "#666666", "#c0c0c0"],
//
//            chartConfig: {
//                chart: {
//                    zoomType: "xy"
//                },
//                xAxis: {
//                    categories: [],
//                    tickmarkPlacement: "on",
//                    tickInterval: 7,
//                    title: {
//                        text: "Days",
//                        margin: 12
//                    },
//                    maxPadding: 0.25,
//                    labels: {
//                        x: 0,
//                        y: 20,
//                        overflow: "justify"
//                    }
//                },
////                yAxis: [],
//                tooltip: {
//                    formatter: function () {
//                        var floatValue = parseFloat(this.y),
//                            value = this.y;
//
//                        if (!isNaN(floatValue)) {
//                            value = Math.floor(floatValue * 100) / 100;
//                        }
//
//                        return "" + this.x + "<br />" + this.series.name + ": " + value;
//                    }
//                },
//                plotOptions: {
//                    series: {
//                        marker: {
//                            enabled: false,
//                            states: {
//                                hover: {
//                                    enabled: true
//                                }
//                            }
//                        },
//                        connectNulls: true
//                    },
//                    column: {
//                        pointPadding: 0,
//                        borderWidth: 0,
//                        stacking: null,
//                        shadow: false
//                    }
//                }
//            }
//        };
//
//    }
//});
//Ext.define('Rally.apps.charts.burndown.BurnDownApp', {
Ext.define('CustomApp', {
extend: 'Rally.app.TimeboxScopedApp',
 logger: new Rally.technicalservices.Logger(),

    settingsScope: 'workspace',

    requires: [
        'Rally.apps.charts.burndown.BurnDownSettings',
        'Rally.data.wsapi.Store',
        'Rally.util.Help',
        'Rally.ui.combobox.IterationComboBox',
        'Rally.ui.combobox.ReleaseComboBox',
        'Rally.apps.charts.IntegrationHeaders',
        'Rally.apps.charts.burndown.BurnDownChart'
    ],

    mixins: [
        'Rally.apps.charts.DateMixin'
    ],

    cls: 'burndown-app',

    items: [
        {
            xtype: 'container',
            itemId: 'header',
            cls: 'header'
        }
    ],

    help: {
        id: 278
    },

    scopeObject: undefined,

    customScheduleStates: ['Accepted'], // a reasonable default
    useCurrentArtifacts: true, 
    config: {
        defaultSettings: {
            showLabels: true,
            chartAggregationType: 'storypoints',
            chartDisplayType: 'line',
            chartTimebox: 'release',
            title: '',
            useCurrentArtifacts: true
        }
    },

    chartComponentConfig: undefined,

    getSettingsFields: function () {
        this.chartSettings = this.chartSettings || Ext.create('Rally.apps.charts.burndown.BurnDownSettings', {
            app: this
        });

        return this.chartSettings.getFields();
    },

    onScopeChange: function (scope) {
        if (!this.ignoreOnScopeChange) {
            this._rebuildChartForScope(scope.getRecord().get('_ref'));
        }
    },

    launch: function () {
        if (this._settingsInvalid()) {
            if (this.owner) {
                this.owner.showSettings();
                return;
            }
        }
        this.customScheduleStates = null;
        this.chartComponentConfig = Ext.create('Rally.apps.charts.burndown.BurnDownChart', this).defaultChartComponentConfig();

        Ext.create('Rally.apps.charts.IntegrationHeaders',this).applyTo(this.chartComponentConfig.storeConfig);

     //   this._addHelpComponent();
        this._loadUserStoryModel();
        this._saveScopeType();
        this.callParent(arguments);

        if (!this.isOnScopedDashboard()) {
            this.ignoreOnScopeChange = true;
            this._getScopePicker().on('ready', this._loadScopePreference, this, {single: true});
        }
  },
    _rebuildChartForScope: function(scopeRef) {
        this._destroyChart();

        this._saveScopePreference(scopeRef);
        this._loadScopeObject(scopeRef);
    },

    _destroyChart: function () {
        this.remove('burndownchart');
    },

    _saveScopePreference: function (scopeRef) {
        if (!this.isOnScopedDashboard()) {
            var settings = {};
            settings[this._getScopeType()] = scopeRef;

            Rally.data.PreferenceManager.update({
                appID: this.getContext().get('appID'),
                settings: settings,
                scope: this
            });
        }
    },

    _loadScopePreference: function (picker) {
        Rally.data.PreferenceManager.load({
            appID: this.getContext().get('appID'),
            success: function (preferences) {
                var scopeRef = preferences[this._getScopeType()];
                if (!scopeRef || scopeRef === 'undefined') {
                    var pickerRecord = picker.getRecord();
                    if (pickerRecord) {
                        scopeRef = pickerRecord.get('_ref');
                        this._saveScopePreference(scopeRef);
                    }
                }
                this.ignoreOnScopeChange = false;

                if (scopeRef && scopeRef !== 'undefined') {
                    this._setScopeValue(scopeRef);
                    scopeRef = this._getScopePicker().getValue();
                    if (scopeRef) {
                        this._rebuildChartForScope(scopeRef);
                    }
                }
            },
            scope: this
        });
    },

    _setScopeValue: function (scopeRef) {
        this._getScopePicker().setValue(scopeRef);
    },

    _loadTimeboxes: function() {
        Ext.create('Rally.data.wsapi.Store', {
            model: this.scopeObject._type,
            filters: [
                {
                    property: 'Name',
                    operator: '=',
                    value: this.scopeObject.Name
                },
                {
                    property: this._getScopeObjectStartDateName(),
                    operator: '=',
                    value: Rally.util.DateTime.toIsoString(this._getScopeObjectStartDate(), true)
                },
                {
                    property: this._getScopeObjectEndDateName(),
                    operator: '=',
                    value: Rally.util.DateTime.toIsoString(this._getScopeObjectEndDate(), true)
                }
            ],
            context: this.getContext().getDataContext(),
            fetch: ['ObjectID'],
            limit: Infinity,
            autoLoad: true,
            listeners: {
                load: function (store, records) {
                    this._getTimeboxesInScope(store, records);
                },
                scope: this
            }
        });
    },

    _onScopeObjectLoaded: function (record) {
        this._setScopeFromData(record);

        this._updateStoreConfig();
        
        this._updateChartTitle();
        this._updateYAxis();

        this._addDateBounds();
        this._addAggregationTypeToCalculator();
        this._updateCompletedScheduleStates();
        this._loadTimeboxes();
    },
    _updateStoreConfig: function(){
        
    },
    _fetchScopeObjects: function(){
        var filters = this.getContext().getTimeboxScope().getQueryFilter();
        this.logger.log('_fetchReleaseObjects', filters);
        
        filters = filters.or(Ext.create('Rally.data.wsapi.Filter', {
            property: "DirectChildrenCount",
            value: 0
        }));

        Ext.create('Rally.data.wsapi.Store',{
            model: 'HierarchicalRequirement',
            fetch: 'ObjectID',
            autoLoad: true, 
            filters: [scope.getQueryFilter()],
            limit: 'Infinity',
            listeners: {
                scope: this,
                load: this._onReleaseArtifactsLoaded
            }
        });
          
      },

    _renderChartBasedOnType: function () {
        if (this._getScopeType() === 'release') {
            this._fetchIterations();
        } else {
            this._addChart();
        }
    },

    _setScopeFromData: function (record) {
        this.scopeObject = record.data;
    },

    _getTimeboxesInScope: function (store, records) {
        var storeConfig = this.chartComponentConfig.storeConfig;
        var type = Ext.String.capitalize(this._getScopeType());
        var oids = [];
        var i;

        this.timeboxes = store.getItems();
        this._clearStoreConfig(storeConfig);

        for (i = 0; i < this.timeboxes.length; i++) {
            oids.push(this.timeboxes[i].ObjectID);
        }
        if (this.useCurrentArtifacts){
            this._fetchCurrentArtifactsForTimeboxes(type, this.timeboxes).then({
                scope: this,
                success: function(objectIds){
                    this.logger.log('_fetchCurrentArtifactsForTimeboxes success', objectIds);
                    storeConfig.find['ObjectID'] = { '$in' : objectIds };
                    this._renderChartBasedOnType();
                }, 
                failure: function(msg){
                    this.logger.log('_fetchCurrentArtifactsForTimeboxes failure: ' + msg);
                }
            });
        } else {
            storeConfig.find[type] = { '$in' : oids };
            this._renderChartBasedOnType();
        }
    },
    _fetchCurrentArtifactsForTimeboxes: function(timeboxType, timeboxOids){
        var deferred = Ext.create('Deft.Deferred');
       console.log(timeboxOids);
        var filters = Ext.create('Rally.data.wsapi.Filter',{
            property: timeboxType,
            value: timeboxOids[0]._ref
        });
        for (var i=1; i<timeboxOids.length; i++){
            filters = filters.or(Ext.create('Rally.data.wsapi.Filter',{
                property: timeboxType,
                value: timeboxOids[i]._ref
            }));
        }
       console.log('filters', filters.toString());
        Ext.create('Rally.data.wsapi.artifact.Store',{
            models: ['HierarchicalRequirement','Defect'],
            fetch: ["ObjectID"],
            filters: filters,
            autoLoad: true, 
            listeners: {
                scope: this,
                load: function(store, records, success){
                    console.log(store,records, success);
                    if (success){
                        var oids = _.map(records, function(r){return r.get('ObjectID')});
                        deferred.resolve(oids);
                    } else {
                        deferred.reject('_fetchTimeboxArtifactsFailed');
                    }
                }
            }
        });
        return deferred;
    },
    _onIterationsLoaded: function (store) {
        this.iterations = store.getItems();

        this._addChart();
        this.down('rallychart').on('snapshotsAggregated', this._addIterationLines, this);
    },

    _addDateBounds: function () {
        this._addDateBoundsToQuery();
        this._addDateBoundsToCalculator();
    },

    _addDateBoundsToQuery: function () {

    },

    _getNow: function() {
        return new Date();
    },

    _addDateBoundsToCalculator: function () {
        var calcConfig = this.chartComponentConfig.calculatorConfig;
        var endDate = this._getScopeObjectEndDate();
        var now = this._getNow();
        calcConfig.startDate = Rally.util.DateTime.toIsoString(this._getScopeObjectStartDate(), true);
        if(now > this._getScopeObjectStartDate() && now < this._getScopeObjectEndDate()) {
            endDate = now;
        }
        calcConfig.endDate = Rally.util.DateTime.toIsoString(endDate, true);
        // S53625: If the time-box has ended, disable the projection line
        if (now > this._getScopeObjectEndDate()) {
            calcConfig.enableProjections = false;
        } else {
            calcConfig.enableProjections = true;
        }
        // add scopeEndDate, which may or may not be the same as endDate
        calcConfig.scopeEndDate = this._getScopeObjectEndDate();
    },

    _addAggregationTypeToCalculator: function () {
        var calcConfig = this.chartComponentConfig.calculatorConfig;
        calcConfig.chartAggregationType = this.getSetting('chartAggregationType');
    },

    _updateCompletedScheduleStates: function () {
        var calcConfig = this.chartComponentConfig.calculatorConfig;
        calcConfig.completedScheduleStateNames = this.customScheduleStates;
    },

    _loadScopeObject: function (scopeRef) {
        Rally.data.ModelFactory.getModel({
            type: this._getScopeType(),

            context: {
                workspace: this.getContext().getWorkspaceRef(),
                project: null
            },
            success: function(model) {
                model.load(Rally.util.Ref.getOidFromRef(scopeRef), {
                    success: function(record) {
                        this._onScopeObjectLoaded(record);
                    },
                    scope: this
                });
            },
            scope: this
        });
    },

    _fetchIterations: function () {
        var store = Ext.create('Rally.data.wsapi.Store', {
            model: Ext.identityFn('Iteration'),
            filters: [
                {
                    property: 'StartDate',
                    operator: '>=',
                    value: Rally.util.DateTime.toIsoString(this._getScopeObjectStartDate(), true)
                },
                {
                    property: 'EndDate',
                    operator: '<=',
                    value: Rally.util.DateTime.toIsoString(this._getScopeObjectEndDate(), true)
                }
            ],
            context: {
                workspace: this.getContext().getWorkspaceRef(),
                project: this.getContext().getProjectRef()
            },
            fetch: ['Name','StartDate','EndDate'],
            limit: Infinity
        });

        store.on('load', this._onIterationsLoaded, this);
        store.load();
    },

    _areIterationsEqual: function (iteration1, iteration2) {
        return iteration1.Name === iteration2.Name &&
               iteration1.StartDate === iteration2.StartDate &&
               iteration1.EndDate === iteration2.EndDate;
    },

    _addIterationLines: function (chart) {
        var axis = chart.chartConfig.xAxis;
        var categories = chart.chartData.categories;
        var i, j;
        var uniqueIterations = [];
        var unique;

        axis.plotLines = [];
        axis.plotBands = [];

        for (i = 0; i < this.iterations.length; i++) {
            unique = true;
            for (j = 0; j < uniqueIterations.length; j++) {
                if(this._areIterationsEqual(uniqueIterations[j], this.iterations[i])) {
                    unique = false;
                    break;
                }
            }
            if(unique === true) {
                uniqueIterations.push(this.iterations[i]);
            }
        }

        for (i = 0; i < uniqueIterations.length; i++) {
            axis.plotLines.push(this._getPlotLine(categories, uniqueIterations[i], false));
            axis.plotBands.push(this._getPlotBand(categories, uniqueIterations[i], i % 2 !== 0));
        }

        if (uniqueIterations.length > 0) {
            axis.plotLines.push(this._getPlotLine(categories, uniqueIterations[uniqueIterations.length - 1], true));
        }
    },
    _buildLabelText: function(iteration) {
        var labelSetting = this.getSetting("showLabels");

        var text = '';
        if (labelSetting) {
            text = iteration.Name || '';
        }
        return text;
    },

    _getPlotBand: function (categories, iteration, shouldColorize) {
        var startDate = this.dateStringToObject(iteration.StartDate);
        var endDate = this.dateStringToObject(iteration.EndDate);

        var label =   {
                text: this._buildLabelText( iteration ),
                align: 'center',
                rotation: 0,
                y: -7
        };

        return {
            color: shouldColorize ? '#F2FAFF' : '#FFFFFF',
            from: this._getNearestWorkday(categories, startDate),
            to: this._getNearestWorkday(categories, endDate),

            label: label
        };
    },

    _getNearestWorkday: function(categories, date) {
        var dateStr = Ext.Date.format(date, 'Y-m-d');
        var index = categories.indexOf(dateStr);
        if(index === -1) {
            var workdays = this._getWorkspaceConfiguredWorkdays();
            if(workdays.length < 1) {
                return -1;
            }
            // date not in categories (probably) means it falls on a non-workday...back up to the next previous workday
            while (workdays.indexOf(Ext.Date.format(date, 'l')) === -1 && date > this._getScopeObjectStartDate()) {
                date = Ext.Date.add(date, Ext.Date.DAY, -1);
                dateStr = Ext.Date.format(date, 'Y-m-d');
                index = categories.indexOf(dateStr);
            }
        }
        return index;
    },

    _getPlotLine: function (categories, iteration, lastLine) {
        var dateObj;
        var dateIndex;

        if (lastLine) {
            dateObj = this.dateStringToObject(iteration.EndDate);
        } else {
            dateObj = this.dateStringToObject(iteration.StartDate);
        }

        dateIndex = this._getNearestWorkday(categories, dateObj);

        return {
            color: '#BBBBBB',
            dashStyle: 'ShortDash',
            width: 2,
            zIndex: 3,
            value: dateIndex
        };
    },

    _addChart: function () {
        this._updateChartConfigDateFormat();
        this._updateChartConfigWorkdays();
        var chartComponentConfig = Ext.Object.merge({}, this.chartComponentConfig);

        this.add(chartComponentConfig);
        this.down('rallychart').on('snapshotsAggregated', this._onSnapshotDataReady, this);
    },

    _onSnapshotDataReady: function (chart) {
        this._updateDisplayType(chart);
        this._updateXAxis(chart);
    },

    _updateDisplayType: function (chart) {
        var series = chart.chartData.series;
        var displayType = this.getSetting('chartDisplayType');
        var i;

        for (i = 0; i < series.length; i++) {
            if (this._seriesFollowsDisplayType(series[i])) {
                series[i].type = displayType;
            }
        }
    },

    _seriesFollowsDisplayType: function (series) {
        return series.name.indexOf('Ideal') === -1 && series.name.indexOf('Prediction') === -1;
    },

    _updateYAxis: function () {
        this._updateYAxisTitle();
        this._updateYAxisConfig();
    },

    _updateYAxisTitle: function () {
        var chartConfig = this.chartComponentConfig.chartConfig;
        chartConfig.yAxis = [
            {}
        ];
        chartConfig.yAxis[0].title = {
            text: this._getAxisTitleBasedOnAggregationType()
        };
    },

    _updateYAxisConfig: function () {
        var axis = this.chartComponentConfig.chartConfig.yAxis[0];
        axis.min = 0;
        axis.labels = {
            x: -5,
            y: 4
        };
    },

    _updateXAxis: function (chart) {
        if(this.container.dom.offsetWidth < 1000) {
            chart.chartConfig.xAxis.labels.staggerLines = 2;
        }
        chart.chartConfig.xAxis.labels.step = Math.round( chart.chartData.categories.length / 100 );
        chart.chartConfig.xAxis.tickInterval = this._configureChartTicks(chart.chartData.categories.length);
    },

    _configureChartTicks: function (days) {
        var pixelTickWidth = 125,
            appWidth = this.getWidth(),
            ticks = Math.floor(appWidth / pixelTickWidth);

        return Math.ceil(days / ticks);
    },

    _getAxisTitleBasedOnAggregationType: function () {
        var aggregationType = this.getSetting('chartAggregationType');
        if (aggregationType === 'storycount') {
            return 'Count';
        } else {
            return 'Points';
        }
    },

    _updateChartConfigDateFormat: function () {
        var self = this;

        this.chartComponentConfig.chartConfig.xAxis.labels.formatter = function () {
            return self._formatDate(self.dateStringToObject(this.value));
        };
    },

    _updateChartConfigWorkdays: function () {
        this.chartComponentConfig.calculatorConfig.workDays = this._getWorkspaceConfiguredWorkdays().split(',');
    },

    _parseRallyDateFormatToHighchartsDateFormat: function () {
        var dateFormat = this._getUserConfiguredDateFormat() || this._getWorkspaceConfiguredDateFormat();

        for (var i = 0; i < this.dateFormatters.length; i++) {
            dateFormat = dateFormat.replace(this.dateFormatters[i].key, this.dateFormatters[i].value);
        }

        return dateFormat;
    },

    _formatDate: function (date) {
        if (!this.dateFormat) {
            this.dateFormat = this._parseRallyDateFormatToHighchartsDateFormat();
        }

        return Highcharts.dateFormat(this.dateFormat, date.getTime());
    },

    _getUserConfiguredDateFormat: function () {
        return this.getContext().getUser().UserProfile.DateFormat;
    },

    _getWorkspaceConfiguredDateFormat: function () {
        return this.getContext().getWorkspace().WorkspaceConfiguration.DateFormat;
    },

    _getWorkspaceConfiguredWorkdays: function () {
        return this.getContext().getWorkspace().WorkspaceConfiguration.WorkDays;
    },

    _updateChartTitle: function () {
        this.chartComponentConfig.chartConfig.title = this._buildChartTitle();
    },

    _buildChartTitle: function () {
        var widthPerCharacter = 10;
        var totalCharacters = Math.floor(this.getWidth() / widthPerCharacter);
        var title = this._getDefaultTitle();
        var align = 'center';

        if (this.scopeObject) {
            title = this.scopeObject.Name;
        }

        if (totalCharacters < title.length) {
            title = title.substring(0, totalCharacters) + '...';
            align = 'left';
        }

        return {
            text: title,
            align: align,
            margin: 30
        };
    },

    _getDefaultTitle: function () {
        return Ext.String.capitalize(this._getScopeType());
    },

    _settingsInvalid: function () {
        var chartAggregationType = this.getSetting('chartAggregationType'),
            chartDisplayType = this.getSetting('chartDisplayType'),
            chartTimebox = this.getSetting('chartTimebox');

        var invalid = function (value) {
            return !value || value === 'undefined';
        };

        return invalid(chartAggregationType) || invalid(chartDisplayType) ||
            this._chartTimeboxInvalid(chartTimebox);
    },

    _chartTimeboxInvalid: function (chartTimebox) {
        if (this.context.getTimeboxScope()) {
            return false;
        }

        return !chartTimebox || chartTimebox === 'undefined';
    },

    _saveScopeType: function () {
        this.scopeType = this._getScopeType();
    },

    _getScopeType: function () {
        if (this.isOnScopedDashboard()) {
            return this._getDashboardScopeType();
        } else {
            return this._getSavedScopeType();
        }
    },

    _getDashboardScopeType: function () {
        return this.getContext().getTimeboxScope().getType();
    },

    _getSavedScopeType: function () {
        return this.getSetting('chartTimebox');
    },

    _getScopePicker: function () {
        if (this.isOnScopedDashboard()) {
            return this.getContext().getTimeboxScope();
        } else {
            return this.down('rally' + this._getScopeType() + 'combobox');
        }
    },

    _getScopeObjectStartDateName: function () {
        if (!this.scopeObject) {
            return '';
        } else if (this.scopeObject._type === 'release') {
            return 'ReleaseStartDate';
        } else {
            return 'StartDate';
        }
    },

    _getScopeObjectEndDateName: function () {
        if (!this.scopeObject) {
            return '';
        } else if (this.scopeObject._type === 'release') {
            return 'ReleaseDate';
        } else {
            return 'EndDate';
        }
    },

    _getScopeObjectStartDate: function () {
        if (!this.scopeObject) {
            return this._getNow();
        } else if (this.scopeObject._type === 'release') {
            return this.scopeObject.ReleaseStartDate;
        } else {
            return this.scopeObject.StartDate;
        }
    },

    _getScopeObjectEndDate: function () {
        if (!this.scopeObject) {
            return this._getNow();
        } else if (this.scopeObject._type === 'release') {
            return this.scopeObject.ReleaseDate;
        } else {
            return this.scopeObject.EndDate;
        }
    },

    _clearStoreConfig: function (storeConfig) {
        if (storeConfig.find.hasOwnProperty('Release')) {
            delete storeConfig.find.Release;
        }

        if (storeConfig.find.hasOwnProperty('Iteration')) {
            delete storeConfig.find.Iteration;
        }
    },

    _loadUserStoryModel: function() {
        Rally.data.ModelFactory.getModel({
            type: "UserStory",
            context: this._getContext(),
            success: function(model) {
                this._getScheduleStateValues(model);
            },
            scope: this
        });
    },

    _getContext: function() {
        return {
            workspace: this.context.getWorkspaceRef(),
            project: null
        };
    },

    _getScheduleStateValues: function (model) {
        if(model) {
            model.getField("ScheduleState").getAllowedValueStore().load({
                callback: function(records, operation, success) {
                    var scheduleStates = _.collect(records, function(obj) {
                        return obj.raw;
                    });

                    var store = this._wrapRecords(scheduleStates);
                    var values = [];
                    var acceptedSeen = false;
                    for(var i = 0; i < store.data.items.length; i++) {
                        if(store.data.items[i].data.StringValue === 'Accepted') {
                            acceptedSeen = true;
                        }
                        if(acceptedSeen) {
                            values.push(store.data.items[i].data.StringValue);
                        }
                    }

                    if(values.length > 0) {
                        this.customScheduleStates = values;
                    }
                },
                scope: this
            });
        }
    },

    _wrapRecords: function(records) {
        return Ext.create("Ext.data.JsonStore", {
            fields: ["_ref", "StringValue"],
            data: records
        });
    },
    /********************************************
    /* Overrides for App class
    /*
    /********************************************/
    isExternal: function(){
      return typeof(this.getAppId()) == 'undefined';
    },
    //showSettings:  Override
    showSettings: function(options) {      
        this._appSettings = Ext.create('Rally.app.AppSettings', Ext.apply({
            fields: this.getSettingsFields(),
            settings: this.getSettings(),
            defaultSettings: this.getDefaultSettings(),
            context: this.getContext(),
            settingsScope: this.settingsScope,
            autoScroll: true
        }, options));
        
        this._appSettings.on('cancel', this._hideSettings, this);
        this._appSettings.on('save', this._onSettingsSaved, this);
        if (this.isExternal()){
            if (this.down('#settings_box').getComponent(this._appSettings.id)==undefined){
                this.down('#settings_box').add(this._appSettings);
            }
        } else {
            this.hide();
            this.up().add(this._appSettings);
        }
        return this._appSettings;
    },
    _onSettingsSaved: function(settings){
        Ext.apply(this.settings, settings);
        this._hideSettings();
        this.onSettingsUpdate(settings);
    },
    //onSettingsUpdate:  Override
    onSettingsUpdate: function (settings){
        //Build and save column settings...this means that we need to get the display names and multi-list
        var cycleStateFields_setting = this.getSetting('cycleStateFields');
        if (cycleStateFields_setting instanceof Array){
            cycleStateFields = cycleStateFields_setting;
        } else {
            cycleStateFields = cycleStateFields_setting.split(',');
        }
        this.logger.log('onSettingsUpdate',settings, cycleStateFields);
        this._fetchFields(cycleStateFields).then({
            scope: this,
            success: function(){
                this.logger.log('Valid fields for cycle and filter time', this.cycleFields, this.filterFields); 
                this._initializeApp(this.cycleFields);
            }
        });


    }


});