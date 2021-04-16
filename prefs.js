const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = imports.misc.extensionUtils.getCurrentExtension();

function init() {}

function buildPrefsWidget() {
  let settings = ExtensionUtils.getSettings(
    "org.gnome.shell.extensions.optimus-manager-indicator"
  );
  let grid = new Gtk.Grid({
    column_spacing: 12,
    row_spacing: 12,
    halign: Gtk.Align.CENTER,
  });
  let alwaysGpuTempLbl = new Gtk.Label({
    label: "Always show GPU Temperature",
    halign: Gtk.Align.START,
  });
  let dynamicHybridLbl = new Gtk.Label({
    label: "Dynamic icon behaviour in hybrid mode, nvidia icon only if gpu is in use",
    halign: Gtk.Align.START,
  });
  let restartGShellLbl = new Gtk.Label({
    label: "Restart Gnome Shell (alt + F2, type r and hit ENTER) to see the changes",
    halign: Gtk.Align.START,
  });

  let alwaysGpuTempSw = new Gtk.Switch();
  let dynamicHybridSw = new Gtk.Switch();

  let saveButton = new Gtk.Button({
    label: " Save Changes ",
    visible: true,
  });
  
  grid.attach(alwaysGpuTempLbl, 0, 0, 1, 1);
  grid.attach(dynamicHybridLbl, 0, 1, 1, 1);
  grid.attach(restartGShellLbl, 0, 2, 1, 1);
  grid.attach(alwaysGpuTempSw, 1, 0, 1, 1);
  grid.attach(dynamicHybridSw, 1, 1, 1, 1);
  grid.attach(saveButton, 1, 50, 1, 1);

  alwaysGpuTempSw.set_state(settings.get_boolean("always-show-gpu-temperature"));
  dynamicHybridSw.set_state(settings.get_boolean("dynamic-hybrid-icon"))

  saveButton.connect("clicked", (button) => {
    settings.set_boolean("always-show-gpu-temperature", alwaysGpuTempSw.get_state());
    settings.set_boolean("dynamic-hybrid-icon", dynamicHybridSw.get_state());
  });

  return grid;
}
