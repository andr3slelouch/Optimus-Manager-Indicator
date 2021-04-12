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

  let label = new Gtk.Label({
    label: "Always show GPU Temperature",
    halign: Gtk.Align.START,
  });
  grid.attach(label, 0, 0, 1, 1);

  let noteLabel = new Gtk.Label({
    label: "Restart Gnome Shell (alt + F2, type r and hit ENTER) to see the changes",
    halign: Gtk.Align.START,
  });
  grid.attach(noteLabel, 0, 0, 1, 4);

  let field = new Gtk.Switch();
  grid.attach(field, 1, 0, 1, 1);

  // Save Button
  let saveButton = new Gtk.Button({
    label: " Save Changes ",
    visible: true,
  });
  grid.attach(saveButton, 1, 50, 1, 1);

  field.set_state(settings.get_boolean("always-show-gpu-temperature"));

  saveButton.connect("clicked", (button) => {
    settings.set_boolean("always-show-gpu-temperature", field.get_state());
  });

  return grid;
}
