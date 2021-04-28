const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Config = imports.misc.config;
const [major] = Config.PACKAGE_VERSION.split('.');
const shellVersion = Number.parseInt(major);
const Gettext = imports.gettext;

Gettext.bindtextdomain( "OptimusManagerIndicator", Me.dir.get_child('locale').get_path() );
Gettext.textdomain("OptimusManagerIndicator");

const _ = Gettext.gettext;

function init() {
}

function buildPrefsWidget() {
  let settings = ExtensionUtils.getSettings(
    "org.gnome.shell.extensions.optimus-manager-indicator"
  );
  let grid = new Gtk.Grid({
    column_spacing: 12,
    row_spacing: 12,
    halign: Gtk.Align.CENTER,
  });
  if (shellVersion < 40){
    let grid = new Gtk.Grid({
      margin: 12,
      column_spacing: 12,
      row_spacing: 12,
      halign: Gtk.Align.CENTER,
    });  
  }
  
  let alwaysGpuTempLbl = new Gtk.Label({
    label: _("Always show GPU Temperature, even if Optimus Manager is unavailable"),
    halign: Gtk.Align.START,
  });
  let dynamicHybridLbl = new Gtk.Label({
    label: _("Dynamic icon behaviour in hybrid mode, nvidia icon only if gpu is in use"),
    halign: Gtk.Align.START,
  });
  let showGPUTempLbl = new Gtk.Label({
    label: _("Show GPU Temperature"),
    halign: Gtk.Align.START,
  });
  let showGPUUtilizationLbl = new Gtk.Label({
    label: _("Show GPU Utilization"),
    halign: Gtk.Align.START,
  });
  let showGPUMemoryUtilizationLbl = new Gtk.Label({
    label: _("Show GPU Memory Utilization"),
    halign: Gtk.Align.START,
  });
  let restartGShellLbl = new Gtk.Label({
    label: _("Restart Gnome Shell ")+shellVersion.toString() +_(" (alt + F2, type r and hit ENTER) to see the changes"),
    halign: Gtk.Align.START,
  });

  let alwaysGpuTempSw = new Gtk.Switch();
  let dynamicHybridSw = new Gtk.Switch();
  let showGPUTempSw = new Gtk.Switch();
  let showGPUUtilizationSw = new Gtk.Switch();
  let showGPUMemoryUtilizationSw = new Gtk.Switch();

  let saveButton = new Gtk.Button({
    label: _(" Save Changes "),
    visible: true,
  });
  
  grid.attach(alwaysGpuTempLbl, 0, 0, 1, 1);
  grid.attach(dynamicHybridLbl, 0, 1, 1, 1);
  grid.attach(showGPUTempLbl, 0, 2, 1, 1);
  grid.attach(showGPUUtilizationLbl, 0, 3, 1, 1);
  grid.attach(showGPUMemoryUtilizationLbl, 0, 4, 1, 1);
  grid.attach(restartGShellLbl, 0, 5, 1, 1);
  grid.attach(alwaysGpuTempSw, 1, 0, 1, 1);
  grid.attach(dynamicHybridSw, 1, 1, 1, 1);
  grid.attach(showGPUTempSw, 1, 2, 1, 1);
  grid.attach(showGPUUtilizationSw, 1, 3, 1, 1);
  grid.attach(showGPUMemoryUtilizationSw, 1, 4, 1, 1);
  grid.attach(restartGShellLbl, 0, 5, 1, 1);
  grid.attach(saveButton, 1, 50, 1, 1);

  alwaysGpuTempSw.set_state(settings.get_boolean("forced-mode"));
  dynamicHybridSw.set_state(settings.get_boolean("dynamic-hybrid-icon"));
  showGPUTempSw.set_state(settings.get_boolean("show-gpu-temperature"));
  showGPUUtilizationSw.set_state(settings.get_boolean("show-gpu-utilization"));
  showGPUMemoryUtilizationSw.set_state(settings.get_boolean("show-gpu-memory-utilization"));

  saveButton.connect("clicked", (button) => {
    settings.set_boolean("forced-mode", alwaysGpuTempSw.get_state());
    settings.set_boolean("dynamic-hybrid-icon", dynamicHybridSw.get_state());
    settings.set_boolean("show-gpu-temperature",showGPUTempSw.get_state());
    settings.set_boolean("show-gpu-utilization",showGPUUtilizationSw.get_state());
    settings.set_boolean("show-gpu-memory-utilization",showGPUMemoryUtilizationSw.get_state());
  });
  if (shellVersion < 40){
    grid.show_all();
  }
  return grid;
}
