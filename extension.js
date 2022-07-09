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
const { Clutter, Gio, GLib, GObject, Soup } = imports.gi;
const St = imports.gi.St;
const Dialog = imports.ui.dialog;
const Lang = imports.lang;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const ModalDialog = imports.ui.modalDialog;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const ByteArray = imports.byteArray;
const Gtk = imports.gi.Gtk;
const Me = imports.misc.extensionUtils.getCurrentExtension();

let distroName = "/bin/bash -c \"cat /etc/issue.net | awk '{print $1}'\"";
let nvidiaSwitch = "optimus-manager --no-confirm --switch nvidia";
let hybridSwitch = "optimus-manager --no-confirm --switch hybrid";
let intelSwitch = "optimus-manager --no-confirm --switch intel";

let switchCommandsDict = {
  Arch: {
    nvidiaSwitch: "optimus-manager --no-confirm --switch nvidia",
    hybridSwitch: "optimus-manager --no-confirm --switch hybrid",
    intelSwitch: "optimus-manager --no-confirm --switch intel",
  },
  Ubuntu: {
    nvidiaSwitch: "prime-select nvidia",
    hybridSwitch: "prime-select on-demand",
    intelSwitch: "prime-select intel",
  },
};

let notifySwitch =
  'notify-send -h int:transient:2 -i \\"dialog-information-symbolic\\" \\"Optimus Manager Indicator\\" \\"Switching graphics and restaring X server to finalize process! \\" ; ';
let nvidiaSettings = "nvidia-settings -p 'PRIME Profiles'";
let panelTempText, timeout;

const OptimusManagerDialog = GObject.registerClass(
  class OptimusManagerDialog extends ModalDialog.ModalDialog {
    _init() {
      this.parent({
        styleClass: "extension-dialog",
      });
      this._mode = mode;

      this.setButtons([
        {
          label: "No",
          action: this._onNoButtonPressed.bind(this),
          key: Clutter.Escape,
        },
        {
          label: "Yes",
          action: this._onYesButtonPressed.bind(this),
          default: true,
        },
      ]);

      let content = new Dialog.MessageDialogContent({
        title: "Restart X server to switch on " + this._mode + "?",
      });

      this.contentLayout.add(content);
    }

    _onNoButtonPressed() {
      this.close();
      this._invocation.return_value(GLib.Variant.new("(s)", ["cancelled"]));
    }

    _onYesButtonPressed() {
      var switching = {
        Intel: intelSwitch,
        Hybrid: hybridSwitch,
        Nvidia: nvidiaSwitch,
      };
      // var [ok, out, err, exit] = GLib.spawn_command_line_sync(notifySwitch);
      var [ok, out, err, exit] = GLib.spawn_command_line_sync(
        "prime-offload"
      );
      var [ok, out, err, exit] = GLib.spawn_command_line_sync(
        switching[this._mode]
      );
      this.close();
    }
  }
)
/**
 * Behold the Optimus Manager Indicator Indicator class.
 */
const OptimusManagerIndicator  = GObject.registerClass(
  class OptimusManagerIndicator extends PanelMenu.Button {
    _init() {
      super._init(0.0, "OptimusManagerIndicator");

      /**
       * Construct the status icon and add it to the panel.
       */
      this.statusIcon = new St.Icon({
        style_class: "system-status-icon",
      });
  
      //this._detectDistro();
  
      this._detectPrimeState();
  
      let topBox = new St.BoxLayout({ vertical: false, style_class: 'panel-status-menu-box' });
      panelTempText = new St.Label({
        y_expand: true,
        y_align: Clutter.ActorAlign.CENTER,
        text: "",
      });
      topBox.add_child(this.statusIcon);
      topBox.add_child(panelTempText);
      this.add_child(topBox);
  
      /**
       * Create all menu items.
       */
  
      this.nvidiaProfiles = new PopupMenu.PopupImageMenuItem(
        "NVIDIA PRIME Profiles",
        Gio.icon_new_for_string(
          Me.dir.get_child('icons').get_path() + "/primeindicatornvidiasymbolic.svg"
        )
      );
      this.switchIntel = new PopupMenu.PopupImageMenuItem(
        "Switch to INTEL",
        Gio.icon_new_for_string(
          Me.dir.get_child('icons').get_path() + "/primeindicatorintelsymbolic.svg"
        )
      );
      this.switchHybrid = new PopupMenu.PopupImageMenuItem(
        "Switch to HYBRID",
        Gio.icon_new_for_string(
          Me.dir.get_child('icons').get_path() + "/primeindicatorhybridsymbolic.svg"
        )
      );
      this.switchNvidia = new PopupMenu.PopupImageMenuItem(
        "Switch to NVIDIA",
        Gio.icon_new_for_string(
          Me.dir.get_child('icons').get_path() + "/primeindicatornvidiasymbolic.svg"
        )
      );
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
      this.nvidiaProfiles.connect(
        "activate",
        Lang.bind(this, function () {
          var res = GLib.spawn_command_line_async(nvidiaSettings);
        })
      );
      this.switchIntel.connect(
        "activate",
        Lang.bind(this, function () {
          let dialog = new OptimusManagerDialog("Intel");
          dialog.open(global.get_current_time());
        })
      );
      this.switchHybrid.connect(
        "activate",
        Lang.bind(this, function () {
          let dialog = new OptimusManagerDialog("Hybrid");
          dialog.open(global.get_current_time());
        })
      );
      this.switchNvidia.connect(
        "activate",
        Lang.bind(this, function () {
          let dialog = new OptimusManagerDialog("Nvidia");
          dialog.open(global.get_current_time());
        })
      );
      this._setMode(this.gpu_mode);
    }

    /**
    * This function shows or hides the indicator.
    */
    _setIndicatorVisibility(visible) {
      this.visible = visible;
    }
    /**
    * This function saves the current mode and makes calls to set both the icon and menu into the requested mode.
    */
    _setMode(mode) {
      this._setTempMode(mode);
      this._setMenuMode(mode);

      this.mode = mode;
    } 
    /**
    * This function would check the optimus manager status
    */
    _detectPrimeState() {
      //let settings = getSettings();
      //let forcedMode = settings.get_boolean("always-show-gpu-temperature");
      let forcedMode = false;
      if (forcedMode) {
        this.gpu_mode = "forced";
        this._setIcon("nvidia");
      } else {
        var [
          ok,
          optimusManagerOut,
          optimusManagerErr,
          exit,
        ] = GLib.spawn_command_line_sync(
          "/bin/bash -c \"optimus-manager --print-mode | grep 'Current GPU mode' | awk '{print $5}'\""
        );
        var [ok, nvidiaSmiOut, nvidiaSmiErr, exit] = GLib.spawn_command_line_sync(
          "/bin/bash -c \"nvidia-smi -q -d TEMPERATURE | grep 'GPU Current Temp' | awk '{print $5}'\""
        );
        if (optimusManagerErr == "" && optimusManagerOut != "") {
          this.gpu_mode = ByteArray.toString(optimusManagerOut).replace("\n", "");
          this._setIcon(this.gpu_mode);
        } else if (optimusManagerErr != "" && nvidiaSmiOut != "") {
          this.gpu_mode = "nvidia";
          this._setIcon(this.gpu_mode);
        } else {
          this.gpu_mode = "error";
          this._setIcon(this.gpu_mode);
        }
      }
    }
    /**
     * This function would define the correct commands to switch depending if is Ubuntu or Arch.
     */
    _detectDistro() {
      var switchCommandsDict = {
        Arch: {
          nvidiaSwitch: "optimus-manager --no-confirm --switch nvidia",
          hybridSwitch: "optimus-manager --no-confirm --switch hybrid",
          intelSwitch: "optimus-manager --no-confirm --switch intel",
        },
        Ubuntu: {
          nvidiaSwitch: "prime-select nvidia",
          hybridSwitch: "prime-select on-demand",
          intelSwitch: "prime-select intel",
        },
      };
      var [ok, distroOut, distroErr, exit] = GLib.spawn_command_line_sync(
        "/bin/bash -c \"cat /etc/issue.net | awk '{print $1}'\""
      );
      console.log(distroOut + "" + distroErr);
      this.nvidiaSwitch = switchCommandsDict[distroOut]["nvidiaSwitch"];
      this.hybridSwitch = switchCommandsDict[distroOut]["hybridSwitch"];
      this.intelSwitch = switchCommandsDict[distroOut]["intelSwitch"];
    }

    /**
     * This function makes every menu item reflect the current mode Optimus Manager Indicator is in.
     */
    _setMenuMode(mode) {
      switch (mode) {
        case "intel":
          this.nvidiaProfiles.visible = false;
          this.nvidiaProfiles.setSensitive(false);
          this.switchIntel.visible = false;
          this.switchIntel.setSensitive(false);
          this.switchHybrid.visible = true;
          this.switchHybrid.setSensitive(true);
          this.switchNvidia.visible = true;
          this.switchNvidia.setSensitive(true);
          break;

        case "hybrid":
          this.nvidiaProfiles.visible = true;
          this.nvidiaProfiles.setSensitive(true);
          this.switchIntel.visible = true;
          this.switchIntel.setSensitive(true);
          this.switchHybrid.visible = false;
          this.switchHybrid.setSensitive(false);
          this.switchNvidia.visible = true;
          this.switchNvidia.setSensitive(true);
          break;

        case "nvidia":
          this.nvidiaProfiles.visible = true;
          this.nvidiaProfiles.setSensitive(true);
          this.switchIntel.visible = true;
          this.switchIntel.setSensitive(true);
          this.switchHybrid.visible = true;
          this.switchHybrid.setSensitive(true);
          this.switchNvidia.visible = false;
          this.switchNvidia.setSensitive(false);
          break;

        case "forced":
          this.nvidiaProfiles.visible = true;
          this.nvidiaProfiles.setSensitive(true);
          this.switchIntel.visible = true;
          this.switchIntel.setSensitive(true);
          this.switchHybrid.visible = true;
          this.switchHybrid.setSensitive(true);
          this.switchNvidia.visible = true;
          this.switchNvidia.setSensitive(true);
          break;

        default:
          this._setIcon("intel");
          Main.notifyError(_("You're not using GDM-PRIME"));
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
    }

    /**
     * This function makes the status icon reflect the current mode Optimus Manager Indicator is in.
     */
    _setTempMode(mode) {
      switch (mode) {
        case "intel":
          break;

        case "hybrid":
          timeout = Mainloop.timeout_add_seconds(2.0, this._setTemp);
          break;

        case "on-demand":
          timeout = Mainloop.timeout_add_seconds(2.0, this._setTemp);
          break;

        case "nvidia":
          timeout = Mainloop.timeout_add_seconds(2.0, this._setTemp);
          break;

        case "forced":
          timeout = Mainloop.timeout_add_seconds(2.0, this._setTemp);
          break;

        default:
          break;
      }
    }

    /**
     * This function sets the status icon.
     */
    _setIcon(iconName) {
      if (iconName == "error") {
        this.iconName = iconName;
        this.statusIcon = new St.Icon({
          icon_name: "action-unavailable-symbolic.symbolic",
          style_class: "system-status-icon",
        });
      }
      this.iconName = iconName;
      this.statusIcon.gicon = Gio.icon_new_for_string(
        Me.dir.get_child('icons').get_path() + "/primeindicator" + iconName + "symbolic.svg"
      );
    }

    _setTemp() {
      var [ok, out, err, exit] = GLib.spawn_command_line_sync(
        "/bin/bash -c \"nvidia-smi -q -d TEMPERATURE | grep 'GPU Current Temp' | awk '{print $5}'\""
      );
      panelTempText.set_text(ByteArray.toString(out).replace("\n", "") + "°C");
      return true;
    }
  }
)

/**
 * This is our Optimus Manager Indicator instance.
 */
let optimusManagerIndicator = null;

/**
 * This function is called by GNOME Shell to enable the extension.
 */
function enable() {
  optimusManagerIndicator = new OptimusManagerIndicator();
  Main.panel.addToStatusArea(
    "optimus-manager-indicator",
    optimusManagerIndicator
  );
}

/**
 * This function is called by GNOME Shell to disable the extension.
 */
function disable() {
  Mainloop.source_remove(timeout);
  optimusManagerIndicator?.destroy();
  optimusManagerIndicator = null;
  panelTempText?.destroy();
  panelTempText = null;
}

function getSettings() {
  let GioSSS = Gio.SettingsSchemaSource;
  let schemaSource = GioSSS.new_from_directory(
    Me.dir.get_child("schemas").get_path(),
    GioSSS.get_default(),
    false
  );
  let schemaObj = schemaSource.lookup(
    "org.gnome.shell.extensions.optimus-manager-indicator",
    true
  );
  if (!schemaObj) {
    throw new Error("Cannot find schemas");
  }
  return new Gio.Settings({ settings_schema: schemaObj });
}