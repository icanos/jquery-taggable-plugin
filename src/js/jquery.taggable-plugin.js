(function( $ ) {

  $.fn.taggable = function(options) {
    var insideTag = false;
    var opts = $.extend({}, $.fn.taggable.defaults, options);
    var classes = $(this).attr('class');
    var values = {};
    var currentTag = '', inputCache = '';
    var currentSelectedTagIdx = -1;

    $(this).wrap('<div class="taggable-container" contenteditable="false"></div>');
    $('.taggable-container').append('<input type="hidden" name="' + opts.elementName + '" id="taggable_' + opts.elementName + '"/>');

    // Remove the input and replace by a div
    $(this).remove();
    $('.taggable-container').append('<div class="' + classes + '" contenteditable="false"><div class="taggable-input" contenteditable="true"></div></div>');

    var helpers = {
      findAttributes: function (data) {
        return $.grep(opts.attributes, function (a) {
          return data.length > 0 && (a.substring(0, data.length).toLowerCase() == data.toLowerCase());
        });
      },
      showAutoComplete: function (attributes, data) {
        var offset = $('.taggable').offset();
        var autoComplete = this.insertAutoComplete();

        autoComplete.find('ul').empty();

        // Populate the auto complete box with information
        $.each(attributes, function (index, value) {
          autoComplete.find('ul').append('<li>' + value + '</li>');
        });

        autoComplete.find('ul').find('li').each(function(i) {
          $(this).click(helpers.clickedAutoCompleteItem);
        });
      },
      insertAutoComplete: function() {
        if ($('.taggable-auto-complete').length) {
          $('.taggable-auto-complete').show();
          return $('.taggable-auto-complete');
        }

        $('.taggable-container').append(opts.autoCompleteTemplate);

        return $('.taggable-auto-complete');
      },
      removeAutoComplete: function() {
        $('.taggable-auto-complete').hide();
      },
      clickedAutoCompleteItem: function() {
        if ($('.taggable-auto-complete').is(':visible')) {
          helpers.insertTag('', $('.taggable-input'), true);
        }
        else {
          helpers.insertTag('', $('.taggable-input'), false);
        }

        // Restore focus
        $('.taggable-input').focus();
      },
      insertTag: function (data, context, isKey) {
        if (isKey) {
          var li = $('.taggable-auto-complete').find('li');
          if (!li.length) {
            // Error?
            return;
          }

          // Take the value from our Auto Completion
          if (currentSelectedTagIdx > -1) {
            li = $('.taggable-auto-complete li').eq(currentSelectedTagIdx);
          }

          data = li.html();

          // Enter key pressed, add the attribute (if it exists)
          context.html('');
          $('<div class="taggable-tag" contenteditable="false">' + data + '</div>').insertBefore('.taggable-input');

          currentTag = data;
          insideTag = true;

          currentSelectedTagIdx = -1;

          // Close the auto Completion
          helpers.removeAutoComplete();
          $('.taggable-auto-complete').css('display', 'none');
        }
        else {
          values[currentTag] = data;
          $('#taggable_' + opts.elementName).val(JSON.stringify(values));
          context.html('');

          $('<div class="taggable-value" contenteditable="false">' + data + '</div>').insertBefore('.taggable-input');

          // Wrap both the attribute and the value in another div to make
          // them more visually understandable
          var objects = context.parent().children();
          objects.slice(objects.length - 3, objects.length - 1).wrapAll('<div class="taggable-pair"></div>');

          // Callback to notify that another filter has been added
          opts.onAddedFilter(currentTag, data);

          currentTag = '';
          insideTag = false;

          // Close the auto Completion
          helpers.removeAutoComplete();
        }
      }
    };

    var functions = {
      search: function() {
        opts.onSearch($('input[name=' + opts.elementName + ']').val());
      },
      focus: function() {
        $('.taggable-input').focus();
      }
    };

    // Hook up some callbacks for when entering text in the box
    $('.taggable-input').keydown(function (e) {
      if (e.keyCode == 13)
      {
        e.handled = true;
        return false;
      }
    });

    $('.taggable-input').keyup(function (e) {
      var data = $(this).text();

      if (e.keyCode == 13 && !insideTag && data.length == 0) {
        // If 'data' is set to nothing (length = 0) we call the
        // 'onSearch' callback and let the user decide what to do.
        if (data.length == 0) {
          opts.onSearch($('input[name=' + opts.elementName + ']').val());
        }
      }
      else if (e.keyCode == 13 && !insideTag) {
        if (!$('.taggable-auto-complete').length) {
          // Only continue with the below code if the auto completion window
          // is open.

          return;
        }

        helpers.insertTag(data, $(this), true);
      }
      else if (e.keyCode == 13 && insideTag) {
        helpers.insertTag(data, $(this), false);
      }
      else if (e.keyCode == 40) {
        // Key down
        var item = $('.taggable-auto-complete li').eq(currentSelectedTagIdx + 1);

        if (currentSelectedTagIdx > -1) {
          var prevItem = $('.taggable-auto-complete li').eq(currentSelectedTagIdx);
          prevItem.removeClass('taggable-selected');
        }

        currentSelectedTagIdx = item.index();
        $('.taggable-auto-complete li').eq(currentSelectedTagIdx).addClass('taggable-selected');

        return false;
      }
      else if (e.keyCode == 38) {
        // Key up
        var item = $('.taggable-auto-complete li').eq(currentSelectedTagIdx - 1);

        if (currentSelectedTagIdx < $('.taggable-auto-complete li').length) {
          var prevItem = $('.taggable-auto-complete li').eq(currentSelectedTagIdx);
          prevItem.removeClass('taggable-selected');
        }

        currentSelectedTagIdx = item.index();
        item.addClass('taggable-selected');

        return false;
      }
      else if (e.keyCode == 8) {
        if (data.length == 0) {
          // No text is written, which means that we should remove
          // tags that we've created earlier
          var obj = $(this).prev();

          // Remove the value from our value list
          if (obj.hasClass('taggable-pair'))
          {
            // This is a key-value-pair, remove the whole pair
            var keyName = obj.find('.taggable-tag').text();
            delete values[keyName];

            currentTag = '';
            insideTag = false;
          }
          else if (obj.hasClass('taggable-tag'))
          {
            // We've only added a key, remove that..
            // This isn't stored in the list yet, so there's no need to remove
            // anything other than the element
            currentTag = '';
            insideTag = false;
          }

          obj.remove();

          $('#taggable_' + opts.elementName).val(JSON.stringify(values));

          e.handled = true;
          return false;
        }
      }

      if (data.length < opts.minChars)
      {
        if ($('.taggable-auto-complete').length && $('.taggable-auto-complete').is(':visible')) {
          helpers.removeAutoComplete();
        }

        return;
      }

      var attribs = helpers.findAttributes(data);
      if (attribs.length == 0)
      {
        if ($('.taggable-auto-complete').length && $('.taggable-auto-complete').is(':visible')) {
          helpers.removeAutoComplete();
        }

        return;
      }

      // Show auto complete box
      helpers.showAutoComplete(attribs, data);
    });

    return functions;
  };

  $.fn.taggable.defaults = {
    elementName: 'tags',
    minChars: 3,
    attributes: [],
    autoCompleteTemplate: '<div class="taggable-auto-complete"><ul></ul></div>',
    onSearch: function(searchQuery) { },
    onAddedFilter: function (key, value) { }
  };

}(jQuery));
