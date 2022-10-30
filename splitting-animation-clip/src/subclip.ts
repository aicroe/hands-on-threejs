import * as THREE from 'three';

/**
 * Function courtesy of Don McCurdy.
 * This function is actually already included as part of the Three.js AnimationUtils class.
 */
export function subclip(
  sourceClip: THREE.AnimationClip,
  name: string,
  startFrame: number,
  endFrame: number,
  fps: number = 30, // Frames Per Second value
): THREE.AnimationClip {

  fps = fps || 30;

  var clip = sourceClip.clone();

  clip.name = name;

  var tracks = [];

  for (var i = 0; i < clip.tracks.length; ++i) {

    var track = clip.tracks[i];
    var valueSize = track.getValueSize();

    var times = [];
    var values = [];

    for (var j = 0; j < track.times.length; ++j) {

      var frame = track.times[j] * fps;

      if (frame < startFrame || frame >= endFrame) continue;

      times.push(track.times[j]);

      for (var k = 0; k < valueSize; ++k) {

        values.push(track.values[j * valueSize + k]);

      }

    }

    if (times.length === 0) continue;

    track.times = THREE.AnimationUtils.convertArray(times, track.times.constructor, false);
    track.values = THREE.AnimationUtils.convertArray(values, track.values.constructor, false);

    tracks.push(track);

  }

  clip.tracks = tracks;

  // find minimum .times value across all tracks in the trimmed clip

  var minStartTime = Infinity;

  for (var i = 0; i < clip.tracks.length; ++i) {

    if (minStartTime > clip.tracks[i].times[0]) {

      minStartTime = clip.tracks[i].times[0];

    }

  }

  // shift all tracks such that clip begins at t=0

  for (var i = 0; i < clip.tracks.length; ++i) {

    clip.tracks[i].shift(- 1 * minStartTime);

  }

  clip.resetDuration();

  return clip;

}
