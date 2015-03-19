 Ext.define("Rally.apps.charts.settings.RadioGroupSetting", {
        extend: "Ext.form.FieldContainer",

        config: {
            settingName: undefined
        },

        constructor: function(config) {
            this.mergeConfig(config);
            this.callParent(arguments);
        },

        getSetting: function() {
            return this.settingsParent.app.getSetting(this.settingName);
        },

        setRadioValue: function (cmp) {
            this.setRadioToCustomValue(cmp, this.getSetting());
        },

        setRadioToCustomValue: function (cmp, customValue) {
            var value = {};
            value[cmp.name] = customValue;
            cmp.setValue(value);
        }
    });
 
 Ext.define("Rally.apps.charts.settings.SettingsChangeMixin", {

     sendSettingsChange: function(artifact) {
         if (this.settingsParent) {
             this.settingsParent.sendSettingsChange(artifact, this);
         }
     },

     receiveSettingsChange: function(artifact) {

     }

 });
 
 Ext.define("Rally.apps.charts.settings.TimeboxPicker", {
     extend: "Rally.apps.charts.settings.RadioGroupSetting",
     alias: "widget.charttimeboxpicker",

     mixins: [
         "Ext.form.field.Field"
     ],

     config: {
         settingName: "chartTimebox"
     },

     settingsParent: undefined,

     initComponent: function () {
         this.callParent(arguments);
         this._addRadioGroup();
     },

     _addRadioGroup: function () {
         this.add({
             xtype: "radiogroup",
             name: this.settingName,
             itemId: this.settingName,
             label: "Level",
             columns: [160, 100, 100],
             vertical: false,
             items: [
                 { boxLabel: "Release", name: this.settingName, inputValue: "release", checked: true },
                 { boxLabel: "Iteration", name: this.settingName, inputValue: "iteration" }
             ],
             listeners: {
                 beforerender: this.setRadioValue,
                 scope: this
             },
             config: {
                 cls: "levelchooser"
             }
         });
     }
 });

Ext.define("Rally.apps.charts.settings.DataTypePicker", {
     extend: "Rally.apps.charts.settings.RadioGroupSetting",
     alias: "widget.chartdatatypepicker",

     mixins: [
         "Ext.form.field.Field",
         "Rally.apps.charts.settings.SettingsChangeMixin"
     ],

     config: {
         settingName: "chartAggregationType"
     },

     settingsParent: undefined,

     initComponent: function () {
         this.callParent(arguments);
         this.add(this._addRadioGroup());
     },

     _addRadioGroup: function () {
         return {
             xtype: "radiogroup",
             name: this.settingName,
             columns: [160, 100],
             vertical: false,
             items: [
                 { boxLabel: "Story Plan Estimate", name: this.settingName, inputValue: "storypoints", checked: true },
                 { boxLabel: "Story Count", name: this.settingName, inputValue: "storycount" }
             ],
             listeners: {
                 beforerender: this.setRadioValue,
                 scope: this
             }
         };
     }
 }); 

Ext.define("Rally.apps.charts.settings.ChartDisplayTypePicker", {
     extend: "Rally.apps.charts.settings.RadioGroupSetting",
     alias: "widget.chartdisplaytypepicker",

     mixins: [
         "Ext.form.field.Field"
     ],

     config: {
         settingName: "chartDisplayType"
     },

     settingsParent: undefined,

     initComponent: function () {
         this.callParent(arguments);
         this.add(this._getPicker());
     },

     _getPicker: function () {
         return {
             xtype: "radiogroup",
             name: this.settingName,
             columns: [160, 100],
             vertical: false,
             items: [
                 { boxLabel: "Line", name: this.settingName, inputValue: "line", checked: true },
                 { boxLabel: "Column", name: this.settingName, inputValue: "column" }
             ],
             listeners: {
                 beforerender: this.setRadioValue,
                 scope: this
             }
         };
     }
 });


 Ext.define("Rally.apps.charts.settings.ChartDisplayTypePicker", {
     extend: "Rally.apps.charts.settings.RadioGroupSetting",
     alias: "widget.chartdisplaytypepicker",

     mixins: [
         "Ext.form.field.Field"
     ],

     config: {
         settingName: "chartDisplayType"
     },

     settingsParent: undefined,

     initComponent: function () {
         this.callParent(arguments);
         this.add(this._getPicker());
     },

     _getPicker: function () {
         return {
             xtype: "radiogroup",
             name: this.settingName,
             columns: [160, 100],
             vertical: false,
             items: [
                 { boxLabel: "Line", name: this.settingName, inputValue: "line", checked: true },
                 { boxLabel: "Column", name: this.settingName, inputValue: "column" }
             ],
             listeners: {
                 beforerender: this.setRadioValue,
                 scope: this
             }
         };
     }
 });
