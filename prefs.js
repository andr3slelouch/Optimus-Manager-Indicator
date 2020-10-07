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
    margin: 12,
    column_spacing: 12,
    row_spacing: 12,
    halign: Gtk.Align.CENTER,
  });

  let label = new Gtk.Label({
    label: "Always show GPU Temperature",
    halign: Gtk.Align.START,
  });
  grid.attach(label, 0, 0, 1, 1);

  let field = new Gtk.Switch();
  grid.attach(field, 1, 0, 1, 1);

  field.set_state(settings.get_boolean("always-show-gpu-temperature"));
  field.connect("state-set", (widget) => {
    settings.set_boolean(
      "always-show-gpu-temperature",
      widget.get_value_as_boolean()
    );
  });
  settings.connect("changed::always-show-gpu-temperature", () => {
    field.set_state(settings.get_boolean("always-show-gpu-temperature"));
  });

  grid.show_all();
  return grid;
}
