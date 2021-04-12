const {GObject, Gtk} = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const PrefsWidget = GObject.registerClass({
    GTypeName: 'PrefsWidget',
    Template: Me.dir.get_child('prefs.ui').get_uri(),
}, class PrefsWidget extends Gtk.Grid {

    _init(params = {}) {
        super._init(params);
    }
    
    _onButtonClicked(button) {
        button.set_label('Clicked!');
    }
});

function init() {}

function buildPrefsWidget() {
    return new PrefsWidget();
}
