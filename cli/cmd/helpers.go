package cmd

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/Goodspoken/dubtab/cli/api"
)

type listEntry struct {
	id      string
	kind    string
	content string
}

// allItems собирает все элементы комнаты в плоский список (тот же порядок, что ls).
func allItems(data *api.RoomData) []listEntry {
	var all []listEntry
	for _, t := range data.Texts {
		all = append(all, listEntry{t.ID, "TEXT", t.Content})
	}
	for _, img := range data.Images {
		name := img.Filename
		if name == "" {
			name = img.URL
		}
		all = append(all, listEntry{img.ID, "IMG ", name})
	}
	for _, a := range data.Audios {
		all = append(all, listEntry{a.ID, "AUD ", a.URL})
	}
	for _, f := range data.Files {
		all = append(all, listEntry{f.ID, "FILE", f.Filename})
	}
	return all
}

// resolveRef принимает строку: число → 1-based индекс, иначе — префикс ID.
// Возвращает (id, kind, content) или ошибку.
func resolveRef(data *api.RoomData, ref string) (listEntry, error) {
	all := allItems(data)

	if n, err := strconv.Atoi(ref); err == nil {
		if n < 1 || n > len(all) {
			return listEntry{}, fmt.Errorf("нет записи с номером %d (всего %d)", n, len(all))
		}
		return all[n-1], nil
	}

	prefix := strings.ToLower(ref)
	var matches []listEntry
	for _, e := range all {
		if strings.HasPrefix(strings.ToLower(e.id), prefix) {
			matches = append(matches, e)
		}
	}
	if len(matches) == 0 {
		return listEntry{}, fmt.Errorf("запись %q не найдена", ref)
	}
	if len(matches) > 1 {
		msg := fmt.Sprintf("несколько записей совпадают с %q:\n", ref)
		for _, m := range matches {
			msg += fmt.Sprintf("  %s  %s\n", m.id[:8], m.kind)
		}
		return listEntry{}, fmt.Errorf("%sуточни ID", msg)
	}
	return matches[0], nil
}
