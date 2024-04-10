/**
 * Optimus Manager Indicator for GNOME Shell
 * Copyright (C) 2020 Andrés Andrade <https://github.com/andr3slelouch>
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 **/

import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Soup from 'gi://Soup';
import St from 'gi://St';

import {Extension, gettext as _, ngettext as __} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
//import ByteArray from 'bytearray';
import Gtk from 'gi://Gtk';
//import ExtensionUtils from 'extensionUtils';

import Gettext from 'gettext';
import {Switch} from './prime.js';

import * as Fromxml from './fromxml.js';

let timeout, statusIcon, panelGpuTemperatureText, panelGpuUtilizationText, panelGpuMemoryText;

/**
 * This is our Optimus Manager Indicator instance.
 */
let optimusManagerIndicator;

/**
 * Optimus Manager Dialog Class:
 * Dialog for asking confirmation to the user for switching profiles
 */
const OptimusManagerDialog = GObject.registerClass(
    class OptimusManagerDialog extends ModalDialog.ModalDialog {
        _init(mode) {
            super._init({
                styleClass: "extension-dialog",
            });
            this._mode = mode;
            this._switching = {};
            this._detectDistro();

            if (this._switching["distro"] == "ubuntu-based") {
                this.switch = new Prime.Switch();
            }

            this.setButtons([
                {
                    label: _("No"),
                    action: this._onNoButtonPressed.bind(this),
                    key: Clutter.Escape,
                },
                {
                    label: _("Yes"),
                    action: this._onYesButtonPressed.bind(this),
                    default: true,
                },
            ]);

            let content = new ModalDialog.MessageDialogContent({
                title: _("Restart X server to switch on ") + this._mode + "?",
            });

            this.contentLayout.add(content);
        }

        _onNoButtonPressed() {
            this.close();
            this._invocation.return_value(GLib.Variant.new("(s)", ["cancelled"]));
        }

        _onYesButtonPressed() {
            if (this._switching["distro"] == "arch-based") {
                GLib.spawn_command_line_sync("prime-offload");
                GLib.spawn_command_line_sync(this._switching[this._mode]);
            } else if (this._switching["distro"] == "ubuntu-based") {
                this.switch.switch(
                    this._switching[this._mode],
                    function (e) {
                        log("logout on gpu switch enabled, logging out");
                        this.logout();
                    }.bind(this)
                );
                this.close();
            }
        }

        _detectDistro() {
            var switchCommandsDict = {
                archBased: {
                    nvidia: "optimus-manager --no-confirm --switch nvidia",
                    hybrid: "optimus-manager --no-confirm --switch hybrid",
                    intel: "optimus-manager --no-confirm --switch intel",
                    distro: "arch-based",
                },
                ubuntuBased: {
                    nvidia: "nvidia",
                    hybrid: "on-demand",
                    intel: "intel",
                    distro: "ubuntu-based",
                },
            };
            /*var [ok, detectOptimus, detectErr, exit] = GLib.spawn_command_line_sync(
                "/bin/bash -c \"whereis optimus-manager | awk -F: '{print $2}'\""
            );
            var [ok, detectPrimeSelect, detectErr, exit] = GLib.spawn_command_line_sync(
                "/bin/bash -c \"whereis prime-select | awk -F: '{print $2}'\""
            );
            detectOptimus = ByteArray.toString(detectOptimus).replace("\n", "");
            detectPrimeSelect = ByteArray.toString(detectPrimeSelect).replace("\n", "");*/

            const detectOptimusCommand = "/bin/bash -c \"whereis optimus-manager | awk -F: '{print $2}'\"";
            const detectPrimeSelectCommand = "/bin/bash -c \"whereis prime-select | awk -F: '{print $2}'\"";

            const [ok1, detectOptimusBytes, err1, exit1] = GLib.spawn_command_line_sync(detectOptimusCommand);
            const detectOptimus = String.fromCharCode.apply(null, detectOptimusBytes).replace("\n", "");

            const [ok2, detectPrimeSelectBytes, err2, exit2] = GLib.spawn_command_line_sync(detectPrimeSelectCommand);
            const detectPrimeSelect = String.fromCharCode.apply(null, detectPrimeSelectBytes).replace("\n", "");


            if (detectOptimus !== "") {
                this._switching = switchCommandsDict["archBased"];
            } else if (detectPrimeSelect !== "") {
                this._switching = switchCommandsDict["ubuntuBased"];
            }
        }
    }
);

export default class OptimusManagerExtension extends Extension {
    constructor(medatada) {
        super(metadata);
    }

    init(){
        String.prototype.format = Format.format;
    }

    enable(){
        
    }
}

/**
 * Optimus Manager Indicator Class
 */
export default class OptimusManagerIndicator extends Extension {
    constructor(metadata) {
        super(metadata);
    }
    //class OptimusManagerIndicator extends PanelMenu.Button {
        enable() {
            this._addIndicator();
            Main.panel.addToStatusArea(
                "optimus-manager-indicator",
                optimusManagerIndicator
            );
        }

        disable() {
            Mainloop.source_remove(timeout);
            optimusManagerIndicator.destroy();
            panelGpuTemperatureText.destroy();
            panelGpuUtilizationText.destroy();
            panelGpuMemoryText.destroy();
        }

        _setIcon(iconName) {
            if (iconName === "error") {
                this.iconName = iconName;
                statusIcon = new St.Icon({
                    icon_name: "action-unavailable-symbolic.symbolic",
                    style_class: "system-status-icon",
                });
            }
            this.iconName = iconName;
            statusIcon.gicon = Gio.icon_new_for_string(
                this.dir.get_child("icons").get_path() +
                "/primeindicator" +
                iconName +
                "symbolic.svg"
            );
            statusIcon.set_gicon(
                Gio.icon_new_for_string(
                    this.dir.get_child("icons").get_path() +
                    "/primeindicator" +
                    iconName +
                    "symbolic.svg"
                )
            );
        }

        //_init() {
        _addIndicator() {
            //super._init(null, "OptimusManagerIndicator");

            /**
             * Construct the status icon and add it to the panel.
             */
            statusIcon = new St.Icon({
                style_class: "system-status-icon",
            });
            panelGpuTemperatureText = new St.Label({
                y_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
                text: "",
            });
            panelGpuUtilizationText = new St.Label({
                y_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
                text: "",
            });
            panelGpuMemoryText = new St.Label({
                y_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
                text: "",
            });

            this._detectPrimeState();

            let settings = this.getSettings();
            let forcedMode = settings.get_boolean("forced-mode");
            let showGPUTemp = settings.get_boolean("show-gpu-temperature");
            let showGPUUtilization = settings.get_boolean("show-gpu-utilization");
            let showGPUMemoryUtilization = settings.get_boolean(
                "show-gpu-memory-utilization"
            );

            let topBox = new St.BoxLayout({
                vertical: false,
                style_class: "panel-status-menu-box",
            });
            topBox.add_child(statusIcon);

            if (this.gpu_mode != "intel") {
                if (forcedMode || showGPUTemp) {
                    topBox.add_child(panelGpuTemperatureText);
                }
                if (showGPUUtilization) {
                    let gpuUtilizationIcon = new St.Icon({
                        style_class: "system-status-icon",
                    });
                    gpuUtilizationIcon.gicon = Gio.icon_new_for_string(
                        this.dir.get_child("icons").get_path() + "/card-symbolic.svg"
                    );
                    topBox.add_child(gpuUtilizationIcon);
                    topBox.add_child(panelGpuUtilizationText);
                }
                if (showGPUMemoryUtilization) {
                    let gpuMemoryUtilizationIcon = new St.Icon({
                        style_class: "system-status-icon",
                    });
                    gpuMemoryUtilizationIcon.gicon = Gio.icon_new_for_string(
                        this.dir.get_child("icons").get_path() + "/ram-symbolic.svg"
                    );
                    topBox.add_child(gpuMemoryUtilizationIcon);
                    topBox.add_child(panelGpuMemoryText);
                }
            }

            this.add_child(topBox);

            /**
             * Create all menu items.
             */

            this.nvidiaProfiles = new PopupMenu.PopupImageMenuItem(
                _("NVIDIA PRIME Profiles"),
                Gio.icon_new_for_string(
                    this.dir.get_child("icons").get_path() +
                    "/primeindicatornvidiasymbolic.svg"
                )
            );
            this.switchIntel = new PopupMenu.PopupImageMenuItem(
                _("Switch to INTEL"),
                Gio.icon_new_for_string(
                    this.dir.get_child("icons").get_path() +
                    "/primeindicatorintelsymbolic.svg"
                )
            );
            this.switchHybrid = new PopupMenu.PopupImageMenuItem(
                _("Switch to HYBRID"),
                Gio.icon_new_for_string(
                    this.dir.get_child("icons").get_path() +
                    "/primeindicatorhybridsymbolic.svg"
                )
            );
            this.switchNvidia = new PopupMenu.PopupImageMenuItem(
                _("Switch to NVIDIA"),
                Gio.icon_new_for_string(
                    this.dir.get_child("icons").get_path() +
                    "/primeindicatornvidiasymbolic.svg"
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
                    GLib.spawn_command_line_async(nvidiaSettings);
                })
            );
            this.switchIntel.connect(
                "activate",
                Lang.bind(this, function () {
                    let dialog = new OptimusManagerDialog("intel");
                    dialog.open(global.get_current_time());
                })
            );
            this.switchHybrid.connect(
                "activate",
                Lang.bind(this, function () {
                    let dialog = new OptimusManagerDialog("hybrid");
                    dialog.open(global.get_current_time());
                })
            );
            this.switchNvidia.connect(
                "activate",
                Lang.bind(this, function () {
                    let dialog = new OptimusManagerDialog("nvidia");
                    dialog.open(global.get_current_time());
                })
            );
            this._setMode(this.gpu_mode);
        }

        _setIndicatorVisibility(visible) {
            this.visible = visible;
        }

        _setMode(mode) {
            this._setTempMode(mode);
            this._setMenuMode(mode);

            this.gpu_mode = mode;
        }

        _detectPrimeState() {
            let settings = this.getSettings();
            let forcedMode = settings.get_boolean("forced-mode");
            if (forcedMode) {
                this.gpu_mode = "forced";
                this._setIcon("nvidia");
            } else {
                /*var [
                    ok,
                    optimusManagerOut,
                    optimusManagerErr,
                    exit,
                ] = GLib.spawn_command_line_sync(
                    "/bin/bash -c \"optimus-manager --print-mode | grep 'Current GPU mode' | awk '{print $5}'\""
                );
                var [
                    ok,
                    nvidiaSmiOut,
                    nvidiaSmiErr,
                    exit,
                ] = GLib.spawn_command_line_sync(
                    "/bin/bash -c \"nvidia-smi -q -d TEMPERATURE | grep 'GPU Current Temp' | awk '{print $5}'\""
                );

                optimusManagerOut = ByteArray.toString(optimusManagerOut).replace(
                    "\n",
                    ""
                );
                optimusManagerErr = ByteArray.toString(optimusManagerErr).replace(
                    "\n",
                    ""
                );

                if (optimusManagerErr !== "") {
                    var [
                        ok,
                        optimusManagerOut,
                        optimusManagerErr,
                        exit,
                    ] = GLib.spawn_command_line_sync('/bin/bash -c "prime-select query"');
                    optimusManagerOut = ByteArray.toString(optimusManagerOut).replace(
                        "\n",
                        ""
                    );
                    optimusManagerErr = ByteArray.toString(optimusManagerErr).replace(
                        "\n",
                        ""
                    );
                }*/

                const optimusManagerCommand = "/bin/bash -c \"optimus-manager --print-mode | grep 'Current GPU mode' | awk '{print $5}'\"";
                const nvidiaSmiCommand = "/bin/bash -c \"nvidia-smi -q -d TEMPERATURE | grep 'GPU Current Temp' | awk '{print $5}'\"";

                let optimusManagerOut = "";
                let optimusManagerErr = "";
                let nvidiaSmiOut = "";
                let nvidiaSmiErr = "";

                let [ok1, optimusManagerOutputBytes, err1, exit1] = GLib.spawn_command_line_sync(optimusManagerCommand);
                optimusManagerOut = String.fromCharCode.apply(null, optimusManagerOutputBytes).replace("\n", "");

                if (optimusManagerOut === "") {
                    let [ok2, optimusManagerOutputBytes, optimusManagerErrBytes, exit2] = GLib.spawn_command_line_sync('/bin/bash -c "prime-select query"');
                    optimusManagerOut = String.fromCharCode.apply(null, optimusManagerOutputBytes).replace("\n", "");
                    optimusManagerErr = String.fromCharCode.apply(null, optimusManagerErrBytes).replace("\n", "");
                }

                let [ok3, nvidiaSmiOutputBytes, err3, exit3] = GLib.spawn_command_line_sync(nvidiaSmiCommand);
                nvidiaSmiOut = String.fromCharCode.apply(null, nvidiaSmiOutputBytes).replace("\n", "");

                if (optimusManagerOut === "integrated") {
                    optimusManagerOut = "intel";
                } else if (optimusManagerOut === "on-demand") {
                    optimusManagerOut = "hybrid";
                }

                if (optimusManagerErr === "" && optimusManagerOut !== "") {
                    this.gpu_mode = optimusManagerOut;
                    this._setIcon(this.gpu_mode);
                } else if (optimusManagerErr !== "" && nvidiaSmiOut !== "") {
                    this.gpu_mode = "nvidia";
                    this._setIcon(this.gpu_mode);
                } else {
                    this.gpu_mode = "error";
                    this._setIcon(this.gpu_mode);
                }
            }
        }

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

        _setTempMode(mode) {
            switch (mode) {
                case "intel":
                    break;

                case "hybrid":
                case "on-demand":
                case "nvidia":
                case "forced":
                    timeout = Mainloop.timeout_add_seconds(2.0, this._setTemp.bind(this));
                    break;

                default:
                    break;
            }
        }


        _setTemp() {
            let settings = this.getSettings();
            let dynamicHybridMode = settings.get_boolean("dynamic-hybrid-icon");

            this.xmlText = ""
            let smi_proc = Gio.Subprocess.new(
                ['/bin/bash', '-c', 'nvidia-smi -q -x'],
                Gio.SubprocessFlags.STDOUT_PIPE
            );
            smi_proc.communicate_utf8_async(null, null, (proc, res) => {
                try {
                    let [, stdout, ] = proc.communicate_utf8_finish(res);

                    if (proc.get_successful()) {
                        let xmlParsed = fromXML.fromXML(stdout);

                        let gpuUtilization = xmlParsed.nvidia_smi_log.gpu.utilization.gpu_util;
                        let gpuMemUtilization = xmlParsed.nvidia_smi_log.gpu.utilization.memory_util;
                        let gpuTemperature = xmlParsed.nvidia_smi_log.gpu.temperature.gpu_temp;

                        panelGpuTemperatureText.set_text(gpuTemperature);
                        panelGpuUtilizationText.set_text(gpuUtilization);
                        panelGpuMemoryText.set_text(gpuMemUtilization);
                        //
                        if ((this.gpu_mode == "hybrid") && dynamicHybridMode) {
                            let mode = "";
                            if (gpuUtilization == "0 %" && gpuMemUtilization == "0 %") {
                                mode = "intel";
                            } else {
                                mode = "nvidia";
                            }
                            statusIcon.set_gicon(
                                Gio.icon_new_for_string(
                                    this.dir.get_child("icons").get_path() +
                                    "/primeindicator" +
                                    mode +
                                    "symbolic.svg"
                                )
                            );
                        }
                    } else {
                        log('nvidia-smi process failed');
                        throw new Error(stderr);
                    }
                } catch (e) {
                    logError(e);
                }
            });

            return GLib.SOURCE_CONTINUE;
        }
    }
    //);

/*
function getSettings() {
    let GioSSS = Gio.SettingsSchemaSource;
    let schemaSource = GioSSS.new_from_directory(
        this.dir.get_child("schemas").get_path(),
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
*/

function init() {
    //ExtensionUtils.initTranslations("OptimusManagerIndicator");
    return new OptimusManagerIndicator();
}
