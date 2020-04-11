/**
    Optimus Manager Indicator for GNOME Shell
    Copyright (C) 2020 Andrés Andrade <https://github.com/andr3slelouch>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
**/
const {
  Clutter,
  Gio,
  GLib,
  GObject,
  Soup
} = imports.gi;
//const Clutter = imports.gi.Clutter;
const St = imports.gi.St;
const Dialog = imports.ui.dialog;
const Lang = imports.lang;
//const Gio = imports.gi.Gio;
//const GObject = imports.gi.GObject;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const ModalDialog = imports.ui.modalDialog;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const ByteArray = imports.byteArray;
//const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
//Gtk.init(null);
const Gettext = imports.gettext.domain('haguichi');
const _ = Gettext.gettext;

const Me = imports.misc.extensionUtils.getCurrentExtension();

let nvidiaSwitch = 'optimus-manager --no-confirm --switch nvidia';
let hybridSwitch = 'optimus-manager --no-confirm --switch hybrid';
let intelSwitch = 'optimus-manager --no-confirm --switch intel';
let notifySwitch = 'notify-send -h int:transient:2 -i \\\"dialog-information-symbolic\\\" \\\"Optimus Manager Indicator\\\" \\\"Switching graphics and restaring X server to finalize process! \\\" ; ';
let nvidiaSettings = "nvidia-settings -p \'PRIME Profiles\'";
let panelTempText, timeout;

var OptimusManagerDialog = GObject.registerClass(
  class OptimusManagerDialog extends ModalDialog.ModalDialog {
    _init(mode) {
      super._init({
        styleClass: 'extension-dialog'
      });
      this._mode = mode;

      this.setButtons([{
        label: "No",
        action: this._onNoButtonPressed.bind(this),
        key: Clutter.Escape,
      }, {
        label: "Yes",
        action: this._onYesButtonPressed.bind(this),
        default: true,
      }]);

      let content = new Dialog.MessageDialogContent({
        title: "Restart X server to switch on " + this._mode + "?"
        //icon: new Gio.FileIcon({
        //    file: Gio.File.new_for_uri(`${REPOSITORY_URL_BASE}${info.icon}`)
        //})
      });

      this.contentLayout.add(content);
    }

    _onNoButtonPressed() {
      this.close();
      this._invocation.return_value(GLib.Variant.new('(s)', ['cancelled']));
    }

    _onYesButtonPressed() {
      var switching = {
        "Intel": intelSwitch,
        "Hybrid": hybridSwitch,
        "Nvidia": nvidiaSwitch
      };
      // var [ok, out, err, exit] = GLib.spawn_command_line_sync(notifySwitch);
      var [ok, out, err, exit] = GLib.spawn_command_line_sync(switching[this._mode]);
      this.close();
    }
  });
/**
 * Behold the Haguichi Indicator class.
 */
const OptimusManagerIndicator = new Lang.Class({
  Name: 'OptimusManagerIndicator',
  Extends: PanelMenu.Button,

  _init: function() {
    this.parent(0.0, 'OptimusManagerIndicator');

    /**
     * Construct the status icon and add it to the panel.
     */
    this.statusIcon = new St.Icon({
      style_class: 'system-status-icon'
    });
    var [ok, out, err, exit] = GLib.spawn_command_line_sync(
      '/bin/bash -c "optimus-manager --print-mode | grep \'Current GPU mode\' | awk \'{print $5}\'"');
    this.gpu_mode = ByteArray.toString(out).replace('\n', '');
    this._setIcon(this.gpu_mode);

    let topBox = new St.BoxLayout();
    panelTempText = new St.Label({
      y_align: Clutter.ActorAlign.CENTER,
      text: ""
    });
    topBox.add_actor(this.statusIcon);
    topBox.add_actor(panelTempText);
    this.add_actor(topBox);

    /**
     * Create all menu items.
     */

    this.nvidiaProfiles = new PopupMenu.PopupImageMenuItem("NVIDIA PRIME Profiles", Gio.icon_new_for_string(Me.path + '/icons/primeindicatornvidiasymbolic.svg'));
    this.switchIntel = new PopupMenu.PopupImageMenuItem("Switch to INTEL", Gio.icon_new_for_string(Me.path + '/icons/primeindicatorintelsymbolic.svg'));
    this.switchHybrid = new PopupMenu.PopupImageMenuItem("Switch to HYBRID", Gio.icon_new_for_string(Me.path + '/icons/primeindicatorhybridsymbolic.svg'));
    this.switchNvidia = new PopupMenu.PopupImageMenuItem("Switch to NVIDIA", Gio.icon_new_for_string(Me.path + '/icons/primeindicatornvidiasymbolic.svg'));
    /**
     * Add the menu items and some separators to the popup menu.
     */
    this.menu.addMenuItem(this.nvidiaProfiles);
    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    this.menu.addMenuItem(this.switchIntel);
    this.menu.addMenuItem(this.switchHybrid);
    this.menu.addMenuItem(this.switchNvidia);

    /**
     * Connect some actions to the menu items.
     */
    this.nvidiaProfiles.connect('activate', Lang.bind(this, function() {
      var res = GLib.spawn_command_line_async(nvidiaSettings);
    }));
    this.switchIntel.connect('activate', Lang.bind(this, function() {
      let dialog = new OptimusManagerDialog("Intel");
      dialog.open(global.get_current_time());
    }));
    this.switchHybrid.connect('activate', Lang.bind(this, function() {
      let dialog = new OptimusManagerDialog("Hybrid");
      dialog.open(global.get_current_time());
    }));
    this.switchNvidia.connect('activate', Lang.bind(this, function() {
      let dialog = new OptimusManagerDialog("Nvidia");
      dialog.open(global.get_current_time());
    }));
    this._setMode(this.gpu_mode);
  },
  /**
   * This function shows or hides the indicator.
   */
  _setIndicatorVisibility: function(visible) {
    this.visible = visible;
  },

  /**
   * This function adds or removes the checkmark for the "Show Haguichi" menu item.
   */
  _setAppVisibility: function(visible) {
    this.showMenuItem.setOrnament((visible == true) ? PopupMenu.Ornament.CHECK : PopupMenu.Ornament.NONE);
  },

  /**
   * This function saves the current mode and makes calls to set both the icon and menu into the requested mode.
   */
  _setMode: function(mode) {
    this._setTempMode(mode);
    this._setMenuMode(mode);

    this.mode = mode;
  },

  /**
   * This function makes every menu item reflect the current mode Haguichi is in.
   */
  _setMenuMode: function(mode) {
    switch (mode) {
      case 'intel':
        this.nvidiaProfiles.visible = false;
        this.nvidiaProfiles.setSensitive(false);
        this.switchIntel.visible = false;
        this.switchIntel.setSensitive(false);
        this.switchHybrid.visible = true;
        this.switchHybrid.setSensitive(true);
        this.switchNvidia.visible = true;
        this.switchNvidia.setSensitive(true);
        break;

      case 'hybrid':
        this.nvidiaProfiles.visible = true;
        this.nvidiaProfiles.setSensitive(true);
        this.switchIntel.visible = true;
        this.switchIntel.setSensitive(true);
        this.switchHybrid.visible = false;
        this.switchHybrid.setSensitive(false);
        this.switchNvidia.visible = true;
        this.switchNvidia.setSensitive(true);
        break;

      case 'nvidia':
        this.nvidiaProfiles.visible = true;
        this.nvidiaProfiles.setSensitive(true);
        this.switchIntel.visible = true;
        this.switchIntel.setSensitive(true);
        this.switchHybrid.visible = true;
        this.switchHybrid.setSensitive(true);
        this.switchNvidia.visible = false;
        this.switchNvidia.setSensitive(false);
        break;

      default:
        this.nvidiaProfiles.visible = true;
        this.nvidiaProfiles.setSensitive(true);
        this.switchIntel.visible = true;
        this.switchIntel.setSensitive(true);
        this.switchHybrid.visible = true;
        this.switchHybrid.setSensitive(true);
        this.switchNvidia.visible = true;
        this.switchNvidia.setSensitive(true);
        break;
    }
  },

  /**
   * This function makes the status icon reflect the current mode Haguichi is in.
   */
  _setTempMode: function(mode) {

    switch (mode) {
      case 'intel':
        break;

      case 'hybrid':
        timeout = Mainloop.timeout_add_seconds(2.0, this._setTemp);
        break;

      case 'nvidia':
        timeout = Mainloop.timeout_add_seconds(2.0, this._setTemp);
        break;

      default:
        break;
    }

  },

  /**
   * This function sets the status icon.
   */
  _setIcon: function(iconName) {
    this.iconName = iconName;
    this.statusIcon.gicon = Gio.icon_new_for_string(Me.path + '/icons/primeindicator' + iconName + 'symbolic.svg');
  },
  _setTemp: function() {
    var [ok, out, err, exit] = GLib.spawn_command_line_sync('/bin/bash -c "nvidia-smi -q -d TEMPERATURE | grep \'GPU Current Temp\' | awk \'{print $5}\'"');
    panelTempText.set_text(ByteArray.toString(out).replace('\n', '') + "°C");
    return true;
  }
});

/**
 * This is our Optimus Manager Indicator instance.
 */
let optimusManagerIndicator;

/**
 * This function is called by GNOME Shell to enable the extension.
 */
function enable() {
  optimusManagerIndicator = new OptimusManagerIndicator();
  Main.panel.addToStatusArea('optimus-manager-indicator', optimusManagerIndicator);
  //Main.panel._rightBox.insert_child_at_index(panelTempText, 1);
}

/**
 * This function is called by GNOME Shell to disable the extension.
 */
function disable() {
  Mainloop.source_remove(timeout);
  optimusManagerIndicator.destroy();
  panelTempText.destroy();
}
